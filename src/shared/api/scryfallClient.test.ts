import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scryfallClient } from '@/shared/api/scryfallClient'
import { useLocaleStore } from '@/shared/locale/localeStore'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Minimal Scryfall card row for the fields the client reads. */
function card(input: {
  id: string
  oracleId: string
  name: string
  printedName?: string
}) {
  return {
    id: input.id,
    oracle_id: input.oracleId,
    name: input.name,
    printed_name: input.printedName,
  }
}

function json(payload: unknown) {
  return { ok: true, json: async () => payload } as Response
}

/** Scryfall's 404 body when a query matches no cards. */
function notFound() {
  return {
    ok: false,
    status: 404,
    json: async () => ({
      object: 'error',
      code: 'not_found',
      status: 404,
      details: "Your query didn't match any cards.",
    }),
  } as Response
}

/** Answer default requests with `en` cards and `lang:es` requests with `es`. */
function answerByLanguage(enCards: unknown[], esCards: unknown[]) {
  fetchMock.mockImplementation(async (url: string) => {
    // `encodeURIComponent('lang:es ')` → `lang%3Aes%20`.
    return url.includes('lang%3Aes')
      ? json({ data: esCards })
      : json({ data: enCards })
  })
}

describe('scryfallClient.fetchSearch bilingual search (Strategy A)', () => {
  it('in es mode issues two requests and prefers the Spanish printing', async () => {
    useLocaleStore.getState().setLocale('es')
    // A exists in both languages; the es request returns its Spanish printing.
    answerByLanguage(
      [card({ id: 'p-a-en', oracleId: 'orb-a', name: 'Lightning Bolt' })],
      [
        card({
          id: 'p-a-es',
          oracleId: 'orb-a',
          name: 'Lightning Bolt',
          printedName: 'Relámpago',
        }),
      ],
    )

    const results = await scryfallClient.fetchSearch('Relámpago')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const urls = fetchMock.mock.calls.map((call) => call[0] as string)
    expect(urls.some((u) => u.includes('lang%3Aes'))).toBe(true)

    // Deduplicated by oracle id: one row, shown in Spanish.
    expect(results).toHaveLength(1)
    expect(results[0].oracleId).toBe('orb-a')
    expect(results[0].name).toBe('Relámpago')
  })

  it('in es mode keeps cards that only exist in English (no coverage loss)', async () => {
    useLocaleStore.getState().setLocale('es')
    // C is Alpha-style: no Spanish printing, only the es-missed default row.
    answerByLanguage(
      [
        card({ id: 'p-c-en', oracleId: 'orb-c', name: 'Ancestral Recall' }),
        card({ id: 'p-a-en', oracleId: 'orb-a', name: 'Lightning Bolt' }),
      ],
      [
        card({
          id: 'p-a-es',
          oracleId: 'orb-a',
          name: 'Lightning Bolt',
          printedName: 'Relámpago',
        }),
        card({
          id: 'p-b-es',
          oracleId: 'orb-b',
          name: 'Lightning Bolt',
          printedName: 'Relámpago',
        }),
      ],
    )

    const results = await scryfallClient.fetchSearch('Lightning Bolt')
    const oracleIds = results.map((r) => r.oracleId).sort()

    // English-only card survives, Spanish match is included, A deduped.
    expect(oracleIds).toEqual(['orb-a', 'orb-b', 'orb-c'])
    // The English-only card falls back to its English name.
    const englishOnly = results.find((r) => r.oracleId === 'orb-c')
    expect(englishOnly?.name).toBe('Ancestral Recall')
  })

  it('in en mode issues a single request with no lang filter', async () => {
    useLocaleStore.getState().setLocale('en')
    answerByLanguage([card({ id: 'p-a-en', oracleId: 'orb-a', name: 'Lightning Bolt' })], [])

    const results = await scryfallClient.fetchSearch('Lightning Bolt')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).not.toContain('lang%3Aes')
    expect(results[0].name).toBe('Lightning Bolt')
  })

  it('normalizes an empty query to no requests at all', async () => {
    useLocaleStore.getState().setLocale('es')
    const results = await scryfallClient.fetchSearch('   ')
    expect(results).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("treats a term with no English match (404) as empty, not a failure", async () => {
    useLocaleStore.getState().setLocale('es')
    // "elfos" matches no English card (Scryfall answers 404) but the Spanish
    // leg finds it. One leg's no-match must not discard the other leg's hits.
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('lang%3Aes')) {
        return json({
          data: [
            card({
              id: 'p-es',
              oracleId: 'orb-es',
              name: 'Llanowar Elves',
              printedName: 'Elfos de Llanowar',
            }),
          ],
        })
      }
      return notFound()
    })

    const results = await scryfallClient.fetchSearch('elfos')

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Elfos de Llanowar')
  })
})

describe('scryfallClient.fetchPrintings name resolution', () => {
  it('keeps the canonical name so foreign printings never leak into the list', async () => {
    useLocaleStore.getState().setLocale('es')
    // `unique=prints` returns one record per language. The foreign rows carry
    // `printed_name`, but printings are fetched without a `lang` scope, so the
    // record's native language is not the active locale and must not win.
    fetchMock.mockResolvedValue(
      json({
        data: [
          card({ id: 'p-en', oracleId: 'orb-a', name: 'Lightning Bolt' }),
          card({
            id: 'p-fr',
            oracleId: 'orb-a',
            name: 'Lightning Bolt',
            printedName: 'Foudre',
          }),
        ],
      }),
    )

    const printings = await scryfallClient.fetchPrintings('orb-a')

    expect(printings).toHaveLength(2)
    expect(printings.every((p) => p.name === 'Lightning Bolt')).toBe(true)
  })
})
