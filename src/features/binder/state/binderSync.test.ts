import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { User } from '@/shared/api/authPort'
import type { BinderEntry, WantEntry } from '@/shared/types/mtg'

vi.mock('@/shared/api/apiClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/apiClient')>()),
  apiConfigured: true,
}))
vi.mock('@/shared/api/apiBinderPort', () => ({
  apiBinderPort: { listEntries: vi.fn(), listWants: vi.fn(), importLocal: vi.fn() },
}))
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn(), warn: vi.fn() } }))

const { startBinderSync, readLegacyBinder } = await import('@/features/binder/state/binderSync')
const { useBinderStore, BINDER_STORAGE_KEY } = await import('@/features/binder/state/binderStore')
const { useSessionStore } = await import('@/features/auth/state/sessionStore')
const { apiBinderPort } = await import('@/shared/api/apiBinderPort')
const { toast } = await import('react-toastify')
const api = vi.mocked(apiBinderPort)

const ana: User = { id: 'u1', email: 'ana@example.com', displayName: 'Ana' }
const entry: BinderEntry = { id: 'e1', printingId: 'p1', quantity: 1, condition: 'NM', language: 'en', forTrade: true }
const want: WantEntry = { id: 'w1', oracleId: 'o1', quantity: 1, priority: 'normal' }
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

const saveLegacy = (entries: BinderEntry[], wants: WantEntry[]) =>
  localStorage.setItem(BINDER_STORAGE_KEY, JSON.stringify({ state: { entries, wants }, version: 1 }))

let stop: () => void = () => {}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  useSessionStore.setState({ user: null, loading: false })
  useBinderStore.setState({ entries: [], wants: [] })
  api.listEntries.mockResolvedValue([entry])
  api.listWants.mockResolvedValue([want])
})

afterEach(() => stop())

describe('binderSync', () => {
  it('loads the signed-in user’s binder from the API', async () => {
    stop = startBinderSync()
    useSessionStore.setState({ user: ana })
    await settle()
    expect(useBinderStore.getState()).toMatchObject({ entries: [entry], wants: [want] })
    expect(api.importLocal).not.toHaveBeenCalled()
  })

  it('empties the binder on sign-out', async () => {
    stop = startBinderSync()
    useSessionStore.setState({ user: ana })
    await settle()
    useSessionStore.setState({ user: null })
    expect(useBinderStore.getState()).toMatchObject({ entries: [], wants: [] })
  })

  it('imports this browser’s local binder first, then removes the local copy', async () => {
    saveLegacy([entry], [want])
    api.importLocal.mockResolvedValueOnce({ imported: { entries: 1, wants: 1 }, skipped: [] })
    stop = startBinderSync()
    useSessionStore.setState({ user: ana })
    await settle()
    expect(api.importLocal).toHaveBeenCalledWith({ entries: [entry], wants: [want] })
    expect(localStorage.getItem(BINDER_STORAGE_KEY)).toBeNull()
    expect(toast.success).toHaveBeenCalledWith('Se importaron 1 carta y 1 deseo de este navegador a tu cuenta.')
  })

  it('keeps the local copy when the import fails, and still loads the account', async () => {
    saveLegacy([entry], [])
    api.importLocal.mockRejectedValueOnce(new Error('down'))
    stop = startBinderSync()
    useSessionStore.setState({ user: ana })
    await settle()
    expect(localStorage.getItem(BINDER_STORAGE_KEY)).not.toBeNull()
    expect(toast.warn).toHaveBeenCalledOnce()
    expect(useBinderStore.getState().entries).toEqual([entry])
  })

  it('warns about items the server could not import', async () => {
    saveLegacy([entry], [])
    api.importLocal.mockResolvedValueOnce({
      imported: { entries: 0, wants: 0 },
      skipped: [{ kind: 'entry', id: 'e1', reason: 'unknown_printing' }],
    })
    stop = startBinderSync()
    useSessionStore.setState({ user: ana })
    await settle()
    expect(toast.warn).toHaveBeenCalledWith('1 elemento no se pudo importar.')
  })

  it('reports a failed load', async () => {
    api.listEntries.mockRejectedValueOnce(new Error('down'))
    stop = startBinderSync()
    useSessionStore.setState({ user: ana })
    await settle()
    expect(toast.error).toHaveBeenCalledOnce()
  })

  it('ignores an empty or corrupt local payload', () => {
    expect(readLegacyBinder()).toBeNull()
    localStorage.setItem(BINDER_STORAGE_KEY, '{not json')
    expect(readLegacyBinder()).toBeNull()
    saveLegacy([], [])
    expect(readLegacyBinder()).toBeNull()
  })
})
