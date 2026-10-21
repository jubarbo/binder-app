import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BinderEntry, WantEntry } from '@/shared/types/mtg'

// API mode: the store mirrors every change to binder-api.
vi.mock('@/shared/api/apiClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/apiClient')>()),
  apiConfigured: true,
}))
vi.mock('@/shared/api/apiBinderPort', () => ({
  apiBinderPort: {
    addEntry: vi.fn(),
    updateEntry: vi.fn(),
    removeEntry: vi.fn(),
    addWant: vi.fn(),
    removeWant: vi.fn(),
  },
}))
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn(), warn: vi.fn() } }))

const { useBinderStore, BINDER_STORAGE_KEY } = await import('@/features/binder/state/binderStore')
const { apiBinderPort } = await import('@/shared/api/apiBinderPort')
const { toast } = await import('react-toastify')
const api = vi.mocked(apiBinderPort)

const entry = (overrides: Partial<BinderEntry> = {}): BinderEntry => ({
  id: 'e1', printingId: 'p1', quantity: 1, condition: 'NM', language: 'en', forTrade: true, ...overrides,
})
const want: WantEntry = { id: 'w1', oracleId: 'o1', quantity: 1, priority: 'normal' }

/** Let the rejected promise's rollback run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  useBinderStore.setState({ entries: [], wants: [] })
})

describe('binderStore in API mode', () => {
  it('adds optimistically and sends the entry to the API', async () => {
    api.addEntry.mockResolvedValueOnce(entry())
    useBinderStore.getState().addEntry(entry())
    expect(useBinderStore.getState().entries).toHaveLength(1)
    expect(api.addEntry).toHaveBeenCalledWith(entry())
    await settle()
    expect(useBinderStore.getState().entries).toHaveLength(1)
  })

  it('undoes an add the server refused and tells the user', async () => {
    api.addEntry.mockRejectedValueOnce(new Error('down'))
    useBinderStore.getState().addEntry(entry())
    await settle()
    expect(useBinderStore.getState().entries).toEqual([])
    expect(toast.error).toHaveBeenCalledOnce()
  })

  it('puts a removed entry back in its place when the delete fails', async () => {
    useBinderStore.setState({ entries: [entry({ id: 'a' }), entry({ id: 'b' }), entry({ id: 'c' })] })
    api.removeEntry.mockRejectedValueOnce(new Error('down'))
    useBinderStore.getState().removeEntry('b')
    expect(useBinderStore.getState().entries.map((e) => e.id)).toEqual(['a', 'c'])
    await settle()
    expect(useBinderStore.getState().entries.map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })

  it('patches quantity, trade flag and details with the right API fields', () => {
    api.updateEntry.mockResolvedValue(entry())
    useBinderStore.setState({ entries: [entry({ finish: 'foil', notes: 'firmada' })] })
    const store = useBinderStore.getState()
    store.updateQuantity('e1', -3)
    store.toggleForTrade('e1')
    store.updateEntryDetails('e1', { finish: undefined, notes: '' })
    expect(api.updateEntry.mock.calls).toEqual([
      ['e1', { quantity: 0 }],
      ['e1', { forTrade: false }],
      ['e1', { finish: null, notes: null }],
    ])
    expect(useBinderStore.getState().entries[0]).toMatchObject({ quantity: 0, forTrade: false })
  })

  it('restores the previous entry when a patch fails', async () => {
    useBinderStore.setState({ entries: [entry({ quantity: 2 })] })
    api.updateEntry.mockRejectedValueOnce(new Error('down'))
    useBinderStore.getState().updateQuantity('e1', 5)
    await settle()
    expect(useBinderStore.getState().entries[0].quantity).toBe(2)
  })

  it('syncs wants and undoes a failed add', async () => {
    api.addWant.mockRejectedValueOnce(new Error('down'))
    useBinderStore.getState().addWant(want)
    await settle()
    expect(useBinderStore.getState().wants).toEqual([])
    api.removeWant.mockResolvedValueOnce(undefined)
    useBinderStore.setState({ wants: [want] })
    useBinderStore.getState().removeWant('w1')
    expect(api.removeWant).toHaveBeenCalledWith('w1')
  })

  it('never writes the binder to localStorage', () => {
    api.addEntry.mockResolvedValueOnce(entry())
    useBinderStore.getState().addEntry(entry())
    expect(localStorage.getItem(BINDER_STORAGE_KEY)).toBeNull()
  })

  it('replaces and clears the whole binder', () => {
    useBinderStore.getState().replaceAll({ entries: [entry()], wants: [want] })
    expect(useBinderStore.getState()).toMatchObject({ entries: [entry()], wants: [want] })
    useBinderStore.getState().clear()
    expect(useBinderStore.getState()).toMatchObject({ entries: [], wants: [] })
  })
})
