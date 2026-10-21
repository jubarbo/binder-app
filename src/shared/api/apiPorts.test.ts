import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiAuthPort } from '@/shared/api/apiAuthPort'
import { apiCatalogPort } from '@/shared/api/apiCatalogPort'
import { apiOffersPort, apiWishersPort } from '@/shared/api/apiMatchPorts'
import { CatalogError } from '@/shared/api/catalogPort'
import { useLocaleStore } from '@/shared/locale/localeStore'

const fetchMock = vi.fn()
const BASE = 'http://localhost:3000/api/v1'

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_URL', BASE)
  useLocaleStore.setState({ locale: 'es' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function json(payload: unknown, status = 200) {
  return { ok: status < 400, status, statusText: '', json: async () => payload } as Response
}

const lastUrl = () => fetchMock.mock.calls.at(-1)?.[0] as string
const lastInit = () => fetchMock.mock.calls.at(-1)?.[1] as RequestInit

describe('apiCatalogPort', () => {
  it('searches in the active locale and returns the API cards as-is', async () => {
    const cards = [{ oracleId: 'o1', name: 'Relámpago', cmc: 1, colors: ['R'], typeLine: 'Instant' }]
    fetchMock.mockResolvedValueOnce(json(cards))
    await expect(apiCatalogPort.fetchSearch('  relampago ')).resolves.toEqual(cards)
    expect(lastUrl()).toBe(`${BASE}/catalog/search?q=relampago&locale=es`)
  })

  it('returns [] for an empty query without calling the API', async () => {
    await expect(apiCatalogPort.fetchSearch('   ')).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('encodes names and ids in the path', async () => {
    fetchMock.mockResolvedValue(json({}))
    await apiCatalogPort.fetchNamed('Fire // Ice')
    expect(lastUrl()).toBe(`${BASE}/catalog/cards/Fire%20%2F%2F%20Ice?locale=es`)
    await apiCatalogPort.fetchPrinting('abc-123')
    expect(lastUrl()).toBe(`${BASE}/catalog/printings/abc-123`)
    await apiCatalogPort.fetchPrintings('o-1')
    expect(lastUrl()).toBe(`${BASE}/catalog/oracles/o-1/printings`)
  })

  it('rethrows API failures as CatalogError with status and code', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { message: 'Printing not found', code: 'not_found', status: 404 } }, 404))
    const error = await apiCatalogPort.fetchPrinting('nope').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(CatalogError)
    expect(error).toMatchObject({ message: 'Printing not found', status: 404, code: 'not_found' })
  })
})

describe('apiAuthPort', () => {
  const ana = { id: 'u1', email: 'ana@example.com', displayName: 'Ana' }

  it('is an available auth system', () => {
    expect(apiAuthPort.available).toBe(true)
  })

  it('reads the session from /users/me and treats 401 as signed out', async () => {
    fetchMock.mockResolvedValueOnce(json(ana))
    await expect(apiAuthPort.session()).resolves.toEqual(ana)
    fetchMock.mockResolvedValueOnce(json({ error: { message: 'Not signed in', code: 'unauthorized' } }, 401))
    await expect(apiAuthPort.session()).resolves.toBeNull()
  })

  it('still surfaces other session failures', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { message: 'boom', code: 'internal' } }, 500))
    await expect(apiAuthPort.session()).rejects.toMatchObject({ status: 500 })
  })

  it('posts credentials for login and register', async () => {
    fetchMock.mockResolvedValue(json(ana))
    await apiAuthPort.login('ana@example.com', 'supersecret')
    expect(lastUrl()).toBe(`${BASE}/auth/login`)
    expect(JSON.parse(lastInit().body as string)).toEqual({ email: 'ana@example.com', password: 'supersecret' })
    await apiAuthPort.register('ana@example.com', 'supersecret', 'Ana')
    expect(lastUrl()).toBe(`${BASE}/auth/register`)
    expect(JSON.parse(lastInit().body as string)).toMatchObject({ displayName: 'Ana' })
  })

  it('logs out with a POST and patches the profile', async () => {
    fetchMock.mockResolvedValueOnce(json(undefined, 204))
    await apiAuthPort.logout()
    expect(lastInit().method).toBe('POST')
    fetchMock.mockResolvedValueOnce(json({ ...ana, displayName: 'Ana B' }))
    await expect(apiAuthPort.updateProfile({ displayName: 'Ana B' })).resolves.toMatchObject({ displayName: 'Ana B' })
    expect(lastInit().method).toBe('PATCH')
  })
})

describe('matching ports', () => {
  it('fetch wishers and offerers already resolved and ordered by the API', async () => {
    const wishers = [{ id: 'u2', displayName: 'Bruno', wantsCopies: 2 }]
    fetchMock.mockResolvedValueOnce(json(wishers))
    await expect(apiWishersPort.wishersOf('o 1')).resolves.toEqual(wishers)
    expect(lastUrl()).toBe(`${BASE}/match/wishers/o%201`)
    const offerers = [{ id: 'u3', displayName: 'Carla', offersCopies: 1 }]
    fetchMock.mockResolvedValueOnce(json(offerers))
    await expect(apiOffersPort.offersOf('o1')).resolves.toEqual(offerers)
    expect(lastUrl()).toBe(`${BASE}/match/offers/o1`)
  })
})
