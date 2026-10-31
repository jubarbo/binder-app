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

/** Multi-face card (transform / MDFC / split): localization lives per face. */
function multiFace(input: {
  id: string
  oracleId: string
  name: string
  faces: { name: string; printedName?: string }[]
}) {
  return {
    id: input.id,
    oracle_id: input.oracleId,
    name: input.name,
    card_faces: input.faces.map((face) => ({
      name: face.name,
      printed_name: face.printedName,
    })),
  }
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

describe('scryfallClient.fetchSearch degraded upstream', () => {
  /** Scryfall's answer during an incident: 503 with an HTML error page. */
  function serviceUnavailable() {
    return {
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async (): Promise<unknown> => {
        throw new SyntaxError('Unexpected token < in JSON')
      },
    } as Response
  }

  it('serves the default leg when the localized leg fails (503)', async () => {
    useLocaleStore.getState().setLocale('es')
    // One leg's outage must not discard the other leg's results: the search
    // degrades to the language that answered instead of failing whole.
    fetchMock.mockImplementation(async (url: string) => {
      return url.includes('lang%3Aes')
        ? serviceUnavailable()
        : json({ data: [card({ id: 'p-a-en', oracleId: 'orb-a', name: 'Lightning Bolt' })] })
    })

    const results = await scryfallClient.fetchSearch('lightning')

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Lightning Bolt')
  })

  it('serves the localized leg when the default leg fails (503)', async () => {
    useLocaleStore.getState().setLocale('es')
    fetchMock.mockImplementation(async (url: string) => {
      return url.includes('lang%3Aes')
        ? json({
            data: [
              card({
                id: 'p-a-es',
                oracleId: 'orb-a',
                name: 'Lightning Bolt',
                printedName: 'Relámpago',
              }),
            ],
          })
        : serviceUnavailable()
    })

    const results = await scryfallClient.fetchSearch('relámpago')

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Relámpago')
  })

  it('fails honestly only when both legs fail', async () => {
    useLocaleStore.getState().setLocale('es')
    fetchMock.mockImplementation(async () => serviceUnavailable())

    await expect(scryfallClient.fetchSearch('lightning')).rejects.toThrow('Service Unavailable')
  })

  it('maps a request timeout to an honest catalog error', async () => {
    useLocaleStore.getState().setLocale('en')
    // What fetch rejects with when AbortSignal.timeout fires.
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'))

    await expect(scryfallClient.fetchSearch('lightning')).rejects.toThrow(
      'The catalog took too long to answer. Try again.',
    )
  })

  it('propagates caller cancellation untouched', async () => {
    useLocaleStore.getState().setLocale('en')
    fetchMock.mockImplementation(
      (_url: string, options?: { signal?: AbortSignal }) =>
        new Promise((_, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    const controller = new AbortController()
    const pending = scryfallClient.fetchSearch('lightning', controller.signal)
    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
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

describe('scryfallClient localized display name', () => {
  it('joins the localized faces for a double-faced card (es)', async () => {
    useLocaleStore.getState().setLocale('es')
    // MDFC: Scryfall keeps an English top-level name and localizes each face,
    // so the top-level `printed_name` is absent and must not decide the name.
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('lang%3Aes')
        ? json({
            data: [
              multiFace({
                id: 'p-mdfc-es',
                oracleId: 'orb-mdfc',
                name: 'Bala Ged Recovery // Bala Ged Sanctuary',
                faces: [
                  {
                    name: 'Bala Ged Recovery',
                    printedName: 'Restauración de Bala Ged',
                  },
                  { name: 'Bala Ged Sanctuary', printedName: 'Refugio de Bala Ged' },
                ],
              }),
            ],
          })
        : notFound(),
    )

    const results = await scryfallClient.fetchSearch('Bala Ged')

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe(
      'Restauración de Bala Ged // Refugio de Bala Ged',
    )
  })

  it('keeps the double-faced name byte-identical when no face is localized', async () => {
    useLocaleStore.getState().setLocale('en')
    // English records carry no per-face printed_name, so the joined faces must
    // reproduce the record's own top-level name exactly (no regression).
    fetchMock.mockResolvedValue(
      json({
        data: [
          multiFace({
            id: 'p-dfc-en',
            oracleId: 'orb-dfc',
            name: 'Delver of Secrets // Insectile Aberration',
            faces: [
              { name: 'Delver of Secrets' },
              { name: 'Insectile Aberration' },
            ],
          }),
        ],
      }),
    )

    const results = await scryfallClient.fetchSearch('Delver')

    expect(results[0].name).toBe('Delver of Secrets // Insectile Aberration')
  })
})

describe('scryfallClient.fetchPrinting back face', () => {
  it('captures the back-face image of a double-faced printing', async () => {
    fetchMock.mockResolvedValue(
      json({
        id: 'p-dfc',
        oracle_id: 'orb-dfc',
        name: 'Bala Ged Recovery // Bala Ged Sanctuary',
        card_faces: [
          {
            name: 'Bala Ged Recovery',
            image_uris: { normal: 'http://img.test/front.png' },
          },
          {
            name: 'Bala Ged Sanctuary',
            image_uris: {
              normal: 'http://img.test/back.png',
              large: 'http://img.test/back-large.png',
            },
          },
        ],
      }),
    )

    const printing = await scryfallClient.fetchPrinting('p-dfc')

    expect(printing.imageNormalBack).toBe('http://img.test/back.png')
    expect(printing.imageLargeBack).toBe('http://img.test/back-large.png')
    // The front still comes from the first face.
    expect(printing.imageNormal).toBe('http://img.test/front.png')
  })

  it('leaves the back empty for a single-faced printing', async () => {
    fetchMock.mockResolvedValue(
      json({
        id: 'p-single',
        oracle_id: 'orb-single',
        name: 'Lightning Bolt',
        image_uris: { normal: 'http://img.test/single.png' },
      }),
    )

    const printing = await scryfallClient.fetchPrinting('p-single')

    expect(printing.imageNormalBack).toBeUndefined()
    expect(printing.imageNormal).toBe('http://img.test/single.png')
  })

  it('leaves the back empty for a split card that shares one image', async () => {
    fetchMock.mockResolvedValue(
      json({
        id: 'p-split',
        oracle_id: 'orb-split',
        name: 'Fire // Ice',
        image_uris: { normal: 'http://img.test/split.png' },
        card_faces: [{ name: 'Fire' }, { name: 'Ice' }],
      }),
    )

    const printing = await scryfallClient.fetchPrinting('p-split')

    expect(printing.imageNormalBack).toBeUndefined()
  })
})

describe('scryfallClient.fetchNamed back face', () => {
  it('captures the back-face image of a double-faced oracle card', async () => {
    fetchMock.mockResolvedValue(
      json({
        id: 'c-dfc',
        oracle_id: 'orb-dfc',
        name: 'Bala Ged Recovery // Bala Ged Sanctuary',
        card_faces: [
          {
            name: 'Bala Ged Recovery',
            image_uris: { normal: 'http://img.test/front.png' },
          },
          {
            name: 'Bala Ged Sanctuary',
            image_uris: { normal: 'http://img.test/back.png' },
          },
        ],
      }),
    )

    const card = await scryfallClient.fetchNamed('Bala Ged Recovery')

    expect(card.imageNormalBack).toBe('http://img.test/back.png')
    expect(card.imageNormal).toBe('http://img.test/front.png')
  })

  it('leaves the back empty for a single-faced oracle card', async () => {
    fetchMock.mockResolvedValue(
      json({
        id: 'c-single',
        oracle_id: 'orb-single',
        name: 'Lightning Bolt',
        image_uris: { normal: 'http://img.test/single.png' },
      }),
    )

    const card = await scryfallClient.fetchNamed('Lightning Bolt')

    expect(card.imageNormalBack).toBeUndefined()
    expect(card.imageNormal).toBe('http://img.test/single.png')
  })
})
