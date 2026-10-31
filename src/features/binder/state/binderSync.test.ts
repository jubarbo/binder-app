import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BINDER_STORAGE_KEY, useBinderStore } from '@/features/binder/state/binderStore'
import {
  dismissImportOffer,
  importLocalBinder,
  startBinderSync,
  useImportOfferStore,
} from '@/features/binder/state/binderSync'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import type { BinderPort } from '@/shared/api/binderPort'
import type { BinderEntry, WantEntry } from '@/shared/types/mtg'

const local: BinderEntry = {
  id: '00000000-0000-4000-8000-000000000001',
  printingId: 'p-local',
  quantity: 1,
  condition: 'NM',
  language: 'en',
  forTrade: false,
}
const server: BinderEntry = { ...local, id: '00000000-0000-4000-8000-000000000002', printingId: 'p-server' }
const serverWant: WantEntry = { id: '00000000-0000-4000-8000-000000000003', oracleId: 'o1', quantity: 1, priority: 'normal' }
const ana = { id: 'u1', email: 'ana@example.com', displayName: 'Ana' }

function fakePort(overrides: Partial<BinderPort> = {}): BinderPort {
  return {
    listEntries: vi.fn().mockResolvedValue([server]),
    listWants: vi.fn().mockResolvedValue([serverWant]),
    addEntry: vi.fn().mockResolvedValue(undefined),
    patchEntry: vi.fn().mockResolvedValue(undefined),
    removeEntry: vi.fn().mockResolvedValue(undefined),
    addWant: vi.fn().mockResolvedValue(undefined),
    removeWant: vi.fn().mockResolvedValue(undefined),
    importLocal: vi.fn().mockResolvedValue({ imported: { entries: 1, wants: 0 }, skipped: [] }),
    ...overrides,
  }
}

const storedEntries = () =>
  (JSON.parse(localStorage.getItem(BINDER_STORAGE_KEY) ?? '{"state":{"entries":[]}}') as {
    state: { entries: BinderEntry[] }
  }).state.entries

async function signIn(): Promise<void> {
  useSessionStore.setState({ user: ana, loading: false })
  await vi.waitFor(() => expect(useBinderStore.getState().source).toBe('remote'))
}

describe('binder sync with a signed-in user', () => {
  let stop: () => void = () => {}

  beforeEach(() => {
    localStorage.clear()
    useSessionStore.setState({ user: null, loading: false })
    useBinderStore.setState({ entries: [], wants: [], source: 'local' })
    useBinderStore.getState().addEntry(local) // guest data, persisted locally
    useImportOfferStore.setState({ pending: null })
  })
  afterEach(() => {
    stop()
    useSessionStore.setState({ user: null })
  })

  it('loads the binder and wants from the server on sign-in', async () => {
    const port = fakePort()
    stop = startBinderSync({ port, enabled: true })
    await signIn()

    expect(useBinderStore.getState().entries).toEqual([server])
    expect(useBinderStore.getState().wants).toEqual([serverWant])
  })

  it('writes changes to the server and never over the local guest copy', async () => {
    const port = fakePort()
    stop = startBinderSync({ port, enabled: true })
    await signIn()

    useBinderStore.getState().toggleForTrade(server.id)
    useBinderStore.getState().updateQuantity(server.id, 3)
    useBinderStore.getState().removeEntry(server.id)

    expect(port.patchEntry).toHaveBeenCalledWith(server.id, { forTrade: true })
    expect(port.patchEntry).toHaveBeenCalledWith(server.id, { quantity: 3 })
    expect(port.removeEntry).toHaveBeenCalledWith(server.id)
    expect(storedEntries()).toEqual([local])
  })

  it('clears a detail on the server with null when the patch removes it', async () => {
    const port = fakePort()
    stop = startBinderSync({ port, enabled: true })
    await signIn()

    useBinderStore.getState().updateEntryDetails(server.id, { finish: undefined, notes: 'mint' })

    expect(port.patchEntry).toHaveBeenCalledWith(server.id, { finish: null, notes: 'mint' })
  })

  it('reloads the server copy when a write fails', async () => {
    const port = fakePort({ removeEntry: vi.fn().mockRejectedValue(new Error('500')) })
    stop = startBinderSync({ port, enabled: true })
    await signIn()

    useBinderStore.getState().removeEntry(server.id)
    expect(useBinderStore.getState().entries).toEqual([])

    await vi.waitFor(() => expect(useBinderStore.getState().entries).toEqual([server]))
  })

  it('offers to import guest data, and restores it on sign-out', async () => {
    const port = fakePort()
    stop = startBinderSync({ port, enabled: true })
    await signIn()

    expect(useImportOfferStore.getState().pending?.entries).toEqual([local])

    useSessionStore.setState({ user: null })
    await vi.waitFor(() => expect(useBinderStore.getState().source).toBe('local'))
    expect(useBinderStore.getState().entries).toEqual([local])
    expect(useImportOfferStore.getState().pending).toBeNull()
  })

  it('makes no offer when the browser has no guest data', async () => {
    localStorage.clear()
    useBinderStore.setState({ entries: [], wants: [] })
    stop = startBinderSync({ port: fakePort(), enabled: true })
    await signIn()
    expect(useImportOfferStore.getState().pending).toBeNull()
  })

  it('imports the guest data, clears the local copy and reloads the server binder', async () => {
    const port = fakePort()
    stop = startBinderSync({ port, enabled: true })
    await signIn()

    const report = await importLocalBinder(port)

    expect(report.imported.entries).toBe(1)
    expect(port.importLocal).toHaveBeenCalledWith({ entries: [local], wants: [] })
    expect(localStorage.getItem(BINDER_STORAGE_KEY)).toBeNull()
    expect(port.listEntries).toHaveBeenCalledTimes(2)
    expect(useImportOfferStore.getState().pending).toBeNull()
  })

  it('keeps the local copy when the server could not import some items', async () => {
    const port = fakePort({
      importLocal: vi.fn().mockResolvedValue({
        imported: { entries: 0, wants: 0 },
        skipped: [{ kind: 'entry', id: local.id, reason: 'unknown_printing' }],
      }),
    })
    stop = startBinderSync({ port, enabled: true })
    await signIn()

    await importLocalBinder(port)

    expect(storedEntries()).toEqual([local])
  })

  it('keeps the local copy when an id belongs to another account', async () => {
    const port = fakePort({
      importLocal: vi.fn().mockResolvedValue({
        imported: { entries: 0, wants: 0 },
        skipped: [{ kind: 'entry', id: local.id, reason: 'id_taken' }],
      }),
    })
    stop = startBinderSync({ port, enabled: true })
    await signIn()

    await importLocalBinder(port)

    expect(storedEntries()).toEqual([local])
  })

  it('hides the offer for this session when dismissed', async () => {
    stop = startBinderSync({ port: fakePort(), enabled: true })
    await signIn()
    dismissImportOffer()
    expect(useImportOfferStore.getState().pending).toBeNull()
    expect(storedEntries()).toEqual([local])
  })

  it('does nothing when the API is not configured', async () => {
    const port = fakePort()
    stop = startBinderSync({ port, enabled: false })
    useSessionStore.setState({ user: ana })
    await Promise.resolve()
    expect(port.listEntries).not.toHaveBeenCalled()
    expect(useBinderStore.getState().source).toBe('local')
  })
})
