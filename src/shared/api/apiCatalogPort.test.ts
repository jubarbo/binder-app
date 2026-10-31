import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiCatalogPort, apiOffersPort, apiWishersPort } from '@/shared/api/apiCatalogPort'
import { CatalogError } from '@/shared/api/catalogPort'
import { useLocaleStore } from '@/shared/locale/localeStore'

const fetchMock = vi.fn()
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const calledUrl = (n = 0) => new URL(String(fetchMock.mock.calls[n]?.[0]), 'http://app.test')

describe('apiCatalogPort', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    useLocaleStore.setState({ locale: 'es' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('searches with the active locale and returns the API cards as-is', async () => {
    const cards = [{ oracleId: 'o1', name: 'Relámpago', cmc: 1, colors: ['R'], typeLine: 'Instant' }]
    fetchMock.mockResolvedValue(json(200, cards))

    expect(await apiCatalogPort.fetchSearch('  relampago ')).toEqual(cards)
    expect(calledUrl().pathname).toMatch(/\/catalog\/search$/)
    expect(calledUrl().searchParams.get('q')).toBe('relampago')
    expect(calledUrl().searchParams.get('locale')).toBe('es')
  })

  it('returns no results for an empty query without calling the API', async () => {
    expect(await apiCatalogPort.fetchSearch('   ')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('resolves a card by name, encoding it into the path', async () => {
    fetchMock.mockResolvedValue(json(200, { oracleId: 'o1', name: 'Fire // Ice' }))
    await apiCatalogPort.fetchNamed('Fire // Ice')
    expect(calledUrl().pathname).toMatch(/\/catalog\/cards\/Fire%20%2F%2F%20Ice$/)
    expect(calledUrl().searchParams.get('locale')).toBe('es')
  })

  it('surfaces a 404 as a CatalogError with its status', async () => {
    fetchMock.mockResolvedValue(json(404, { error: { message: 'No card found', code: 'not_found', status: 404 } }))
    const error = await apiCatalogPort.fetchNamed('zzz').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(CatalogError)
    expect(error).toMatchObject({ status: 404, code: 'not_found' })
  })

  it('fetches one printing and the printings of an oracle', async () => {
    fetchMock.mockImplementation(async () => json(200, []))
    await apiCatalogPort.fetchPrinting('p1')
    await apiCatalogPort.fetchPrintings('o1')
    expect(calledUrl(0).pathname).toMatch(/\/catalog\/printings\/p1$/)
    expect(calledUrl(1).pathname).toMatch(/\/catalog\/oracles\/o1\/printings$/)
  })
})

describe('apiWishersPort / apiOffersPort', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists who wants a card, keeping the API order', async () => {
    const wishers = [
      { id: 'u2', displayName: 'Bea', wantsCopies: 1 },
      { id: 'u1', displayName: 'Ana', wantsCopies: 4 },
    ]
    fetchMock.mockResolvedValue(json(200, wishers))
    expect(await apiWishersPort.wishersOf('o1')).toEqual(wishers)
    expect(calledUrl().pathname).toMatch(/\/match\/wishers\/o1$/)
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].credentials).toBe('include')
  })

  it('lists who has a card for trade', async () => {
    const offers = [{ id: 'u1', displayName: 'Ana', offersCopies: 2 }]
    fetchMock.mockResolvedValue(json(200, offers))
    expect(await apiOffersPort.offersOf('o1')).toEqual(offers)
    expect(calledUrl().pathname).toMatch(/\/match\/offers\/o1$/)
  })
})

describe('port bindings with VITE_API_URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('select the API adapters when the API is configured', async () => {
    vi.stubEnv('VITE_MOCK_WISHERS', '')
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api/v1')
    vi.resetModules()
    const api = await import('@/shared/api/apiCatalogPort')
    expect((await import('@/shared/api/catalog')).catalogPort).toBe(api.apiCatalogPort)
    expect((await import('@/shared/api/wishersPort')).wishersPort).toBe(api.apiWishersPort)
    expect((await import('@/shared/api/offersPort')).offersPort).toBe(api.apiOffersPort)
  })

  it('keep Scryfall and the empty local ports without it', async () => {
    vi.stubEnv('VITE_MOCK_WISHERS', '')
    vi.stubEnv('VITE_API_URL', '')
    vi.resetModules()
    const { scryfallClient } = await import('@/shared/api/scryfallClient')
    const wishers = await import('@/shared/api/wishersPort')
    const offers = await import('@/shared/api/offersPort')
    expect((await import('@/shared/api/catalog')).catalogPort).toBe(scryfallClient)
    expect(wishers.wishersPort).toBe(wishers.localWishersPort)
    expect(offers.offersPort).toBe(offers.localOffersPort)
  })
})
