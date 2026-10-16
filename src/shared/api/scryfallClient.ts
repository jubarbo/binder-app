import type { OracleCard, Printing } from '@/shared/types/mtg'
import { CatalogError, type CatalogPort } from '@/shared/api/catalogPort'
import { getActiveLocale } from '@/shared/locale/localeStore'

const SCRYFALL_BASE_URL = 'https://api.scryfall.com'

/** Subset of the Scryfall image_uris object we rely on. */
interface ScryfallImageUris {
  small?: string
  normal?: string
  large?: string
}

/** Card faces carry the images for double-faced / modal cards. */
interface ScryfallCardFace {
  image_uris?: ScryfallImageUris
}

interface ScryfallPrices {
  usd?: string | null
  usd_foil?: string | null
}

/** Subset of a Scryfall card object (a printing) used by the binder. */
interface ScryfallCard {
  id: string
  oracle_id?: string
  name: string
  /** Localized name on a non-English printing (absent on English records). */
  printed_name?: string
  mana_cost?: string
  cmc?: number
  colors?: string[]
  type_line?: string
  oracle_text?: string
  set?: string
  set_name?: string
  collector_number?: string
  rarity?: string
  finishes?: string[]
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallCardFace[]
  prices?: ScryfallPrices
}

interface ScryfallList {
  data?: ScryfallCard[]
}

/**
 * Resolve the image URIs for a card. Double-faced / modal cards omit the
 * top-level `image_uris`; their front face holds the images instead.
 */
function resolveImageUris(card: ScryfallCard): ScryfallImageUris {
  return card.image_uris ?? card.card_faces?.[0]?.image_uris ?? {}
}

function toOracleCard(card: ScryfallCard): OracleCard {
  return {
    oracleId: card.oracle_id ?? card.id,
    // Localized display name: the Spanish (or other) printing carries
    // `printed_name`; English records fall back to the canonical `name`.
    name: card.printed_name ?? card.name,
    manaCost: card.mana_cost,
    cmc: card.cmc ?? 0,
    colors: card.colors ?? [],
    typeLine: card.type_line ?? '',
    oracleText: card.oracle_text,
    imageNormal: resolveImageUris(card).normal,
  }
}

function toPrices(prices: ScryfallPrices | undefined): Printing['prices'] {
  if (!prices) return undefined
  // Scryfall encodes "no price" as null; normalize to undefined.
  const usd = prices.usd ?? undefined
  const usdFoil = prices.usd_foil ?? undefined
  if (usd === undefined && usdFoil === undefined) return undefined
  return { usd, usdFoil }
}

function toPrinting(card: ScryfallCard): Printing {
  const images = resolveImageUris(card)
  return {
    id: card.id,
    oracleId: card.oracle_id ?? card.id,
    // Keep the canonical (English) name here. Printings are fetched without a
    // `lang` scope so coverage stays complete, and `unique=prints` returns one
    // record per language (fr, ja, es…) — resolving `printed_name` here would
    // leak foreign names into the list. The active locale resolves the search
    // results instead (see `toOracleCard`), which are fetched in that locale.
    name: card.name ?? '',
    setCode: card.set ?? '',
    setName: card.set_name ?? '',
    collectorNumber: card.collector_number ?? '',
    rarity: card.rarity ?? '',
    finishes: card.finishes ?? [],
    imageSmall: images.small ?? '',
    imageNormal: images.normal ?? '',
    imageLarge: images.large ?? '',
    prices: toPrices(card.prices),
  }
}

async function toCatalogError(response: Response): Promise<CatalogError> {
  let details: string | undefined
  let code: string | undefined
  try {
    const body = (await response.json()) as { details?: string; code?: string }
    details = body.details
    code = body.code
  } catch {
    // Non-JSON error body; fall back to the HTTP status text.
  }
  const message = details ?? response.statusText ?? `Request failed with status ${response.status}`
  return new CatalogError(message, { status: response.status, code })
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    // Let query cancellation propagate untouched.
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new CatalogError('Could not reach the Scryfall catalog. Check your network connection.')
  }

  if (!response.ok) throw await toCatalogError(response)

  try {
    return (await response.json()) as T
  } catch {
    throw new CatalogError('The Scryfall catalog returned a malformed response.')
  }
}

/** Oracle id used to deduplicate the two language result sets. */
function oracleKey(card: ScryfallCard): string {
  return card.oracle_id ?? card.id
}

/**
 * Fetch one page of search results. `lang` scopes Scryfall's matching to a
 * single language's printings. The scope must live *inside* `q` as search
 * syntax — Scryfall ignores a `&lang=` URL param on /cards/search — and it is
 * a hard filter: it drops cards that have no printing in that language.
 */
async function searchPage(
  query: string,
  lang: string | undefined,
  signal?: AbortSignal,
): Promise<ScryfallCard[]> {
  const scoped = lang ? `lang:${lang} ${query}` : query
  const url = `${SCRYFALL_BASE_URL}/cards/search?q=${encodeURIComponent(scoped)}`
  try {
    const body = await requestJson<ScryfallList>(url, signal)
    return body.data ?? []
  } catch (error) {
    // Scryfall answers 404 when a query matches no cards. Within a language
    // leg that is a valid empty result — the term simply has no match in this
    // language — not a failure. Without this, a purely Spanish term (no
    // English match) would reject the whole bilingual Promise.all and discard
    // the Spanish hits. Rate limits, network and server errors still throw.
    if (error instanceof CatalogError && error.status === 404) return []
    throw error
  }
}

/**
 * Live `CatalogPort` implementation backed by the public Scryfall API.
 * Runs in the browser only (uses `fetch`) and never imports Node modules.
 */
export const scryfallClient: CatalogPort = {
  async fetchSearch(query, signal) {
    const trimmed = query.trim()
    if (!trimmed) return []
    const locale = getActiveLocale()

    // English is Scryfall's default: a single request, exactly as before.
    if (locale === 'en') {
      return (await searchPage(trimmed, undefined, signal)).map(toOracleCard)
    }

    // Strategy A, client-side: match the default (English, full coverage) and
    // the localized printings, then merge by oracle id so a Spanish name finds
    // its card while English-only cards never drop out of the results.
    const [defaultCards, localizedCards] = await Promise.all([
      searchPage(trimmed, undefined, signal),
      searchPage(trimmed, locale, signal),
    ])

    const merged = new Map<string, ScryfallCard>()
    // Localized printings first: they carry `printed_name` for display and
    // follow Scryfall's relevance for the requested language.
    for (const card of localizedCards) merged.set(oracleKey(card), card)
    // Then every card the localized pass missed (no translation in that
    // language), so coverage stays complete.
    for (const card of defaultCards) {
      const key = oracleKey(card)
      if (!merged.has(key)) merged.set(key, card)
    }
    return [...merged.values()].map(toOracleCard)
  },

  async fetchNamed(name, signal) {
    const trimmed = name.trim()
    if (!trimmed) throw new CatalogError('A card name is required.')
    const url = `${SCRYFALL_BASE_URL}/cards/named?fuzzy=${encodeURIComponent(trimmed)}`
    const card = await requestJson<ScryfallCard>(url, signal)
    return toOracleCard(card)
  },

  async fetchPrinting(id, signal) {
    const trimmed = id.trim()
    if (!trimmed) throw new CatalogError('A printing id is required.')
    const url = `${SCRYFALL_BASE_URL}/cards/${encodeURIComponent(trimmed)}`
    const card = await requestJson<ScryfallCard>(url, signal)
    return toPrinting(card)
  },

  async fetchPrintings(oracleId, signal) {
    const trimmed = oracleId.trim()
    if (!trimmed) return []
    const query = `oracleid:${trimmed}`
    const url = `${SCRYFALL_BASE_URL}/cards/search?q=${encodeURIComponent(query)}&unique=prints`
    const body = await requestJson<ScryfallList>(url, signal)
    return (body.data ?? []).map(toPrinting)
  },
}

export default scryfallClient
