import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiBinderPort } from '@/shared/api/apiBinderPort'

const fetchMock = vi.fn()
const BASE = 'http://localhost:3000/api/v1'

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_URL', BASE)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const call = (n = -1) => {
  const [url, init] = fetchMock.mock.calls.at(n) as [string, RequestInit]
  return { url, method: init.method, body: init.body ? JSON.parse(init.body as string) : undefined }
}

describe('apiBinderPort', () => {
  it('maps every binder operation to its endpoint', async () => {
    const entry = { id: 'e1', printingId: 'p1', quantity: 1, condition: 'NM' as const, language: 'en', forTrade: true }
    await apiBinderPort.listEntries()
    expect(call()).toMatchObject({ url: `${BASE}/binder/entries`, method: 'GET' })
    await apiBinderPort.addEntry(entry)
    expect(call()).toMatchObject({ url: `${BASE}/binder/entries`, method: 'POST', body: entry })
    await apiBinderPort.updateEntry('e1', { quantity: 2, notes: null })
    expect(call()).toMatchObject({ url: `${BASE}/binder/entries/e1`, method: 'PATCH', body: { quantity: 2, notes: null } })
    await apiBinderPort.removeEntry('e1')
    expect(call()).toMatchObject({ url: `${BASE}/binder/entries/e1`, method: 'DELETE' })
    await apiBinderPort.listWants()
    expect(call()).toMatchObject({ url: `${BASE}/binder/wants`, method: 'GET' })
    await apiBinderPort.removeWant('w1')
    expect(call()).toMatchObject({ url: `${BASE}/binder/wants/w1`, method: 'DELETE' })
    await apiBinderPort.importLocal({ entries: [entry], wants: [] })
    expect(call()).toMatchObject({ url: `${BASE}/binder/import`, method: 'POST', body: { entries: [entry], wants: [] } })
  })
})
