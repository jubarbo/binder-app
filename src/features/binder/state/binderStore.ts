import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { BinderEntryPatch, BinderPort } from '@/shared/api/binderPort'
import type { BinderEntry, Finish, WantEntry } from '@/shared/types/mtg'

/** Binder persistence storage key (zustand persist). Holds the guest (signed-out) binder. */
export const BINDER_STORAGE_KEY = 'binder-app:binder:v1'

/** Schema version of the persisted binder payload. */
const BINDER_STORAGE_VERSION = 1

/** Persisted slice of the binder state (serializable, no actions). */
export interface BinderPersistedState {
  entries: BinderEntry[]
  wants: WantEntry[]
}

/** Server connection while signed in: where writes go and what to do when one fails. */
export interface BinderRemote {
  port: BinderPort
  onWriteError: (error: unknown) => void
}

/** Full store contract: persisted data plus actions. */
interface BinderState extends BinderPersistedState {
  /**
   * `local`: guest data persisted in this browser. `remote`: the signed-in
   * user's binder, owned by binder-api; changes go to the server and the
   * local guest copy is left untouched.
   */
  source: 'local' | 'remote'
  addEntry: (entry: BinderEntry) => void
  removeEntry: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  toggleForTrade: (id: string) => void
  /** Patch the editable details (finish, notes, for-trade) of one entry. */
  updateEntryDetails: (
    id: string,
    patch: { finish?: Finish; notes?: string; forTrade?: boolean },
  ) => void
  addWant: (want: WantEntry) => void
  removeWant: (id: string) => void
}

let remote: BinderRemote | null = null

/** Sends one write to the server when signed in; a failure goes to the sync layer. */
function push(write: (port: BinderPort) => Promise<unknown>): void {
  if (!remote) return
  const { port, onWriteError } = remote
  write(port).catch(onWriteError)
}

/** Local storage that ignores writes while the store mirrors the server. */
const guestStorage = createJSONStorage<BinderPersistedState>(() => ({
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    if (!remote) localStorage.setItem(name, value)
  },
  removeItem: (name) => localStorage.removeItem(name),
}))

/** Binder state: guest data in localStorage, or the signed-in user's server binder. */
export const useBinderStore = create<BinderState>()(
  persist(
    (set, get) => ({
      entries: [],
      wants: [],
      source: 'local',

      addEntry: (entry) => {
        set((state) => ({ entries: [...state.entries, entry] }))
        push((port) => port.addEntry(entry))
      },

      removeEntry: (id) => {
        set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) }))
        push((port) => port.removeEntry(id))
      },

      updateQuantity: (id, quantity) => {
        const clamped = Math.max(0, quantity)
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, quantity: clamped } : entry,
          ),
        }))
        push((port) => port.patchEntry(id, { quantity: clamped }))
      },

      toggleForTrade: (id) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, forTrade: !entry.forTrade } : entry,
          ),
        }))
        const forTrade = get().entries.find((entry) => entry.id === id)?.forTrade
        if (forTrade !== undefined) push((port) => port.patchEntry(id, { forTrade }))
      },

      updateEntryDetails: (id, patch) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, ...patch } : entry,
          ),
        }))
        // A key present with `undefined` (or empty notes) means "clear it"; the API clears with null.
        const body: BinderEntryPatch = {}
        if ('finish' in patch) body.finish = patch.finish ?? null
        if ('notes' in patch) body.notes = patch.notes || null
        if (patch.forTrade !== undefined) body.forTrade = patch.forTrade
        if (Object.keys(body).length > 0) push((port) => port.patchEntry(id, body))
      },

      addWant: (want) => {
        set((state) => ({ wants: [...state.wants, want] }))
        push((port) => port.addWant(want))
      },

      removeWant: (id) => {
        set((state) => ({ wants: state.wants.filter((want) => want.id !== id) }))
        push((port) => port.removeWant(id))
      },
    }),
    {
      name: BINDER_STORAGE_KEY,
      version: BINDER_STORAGE_VERSION,
      storage: guestStorage,
      // Actions are functions and are dropped by JSON serialization anyway;
      // persisting the data slice explicitly keeps the envelope stable.
      partialize: (state) => ({
        entries: state.entries,
        wants: state.wants,
      }),
    },
  ),
)

/** The guest binder saved in this browser, read straight from storage. */
export function readGuestBinder(): BinderPersistedState {
  try {
    const raw = localStorage.getItem(BINDER_STORAGE_KEY)
    const state = raw ? (JSON.parse(raw) as { state?: Partial<BinderPersistedState> }).state : undefined
    return { entries: state?.entries ?? [], wants: state?.wants ?? [] }
  } catch {
    return { entries: [], wants: [] }
  }
}

/** Mirror the signed-in user's server binder; later changes go to `connection.port`. */
export function mirrorServerBinder(data: BinderPersistedState, connection: BinderRemote): void {
  remote = connection
  useBinderStore.setState({ entries: data.entries, wants: data.wants, source: 'remote' })
}

/** Back to the guest binder saved in this browser (sign-out). */
export function restoreGuestBinder(): void {
  const guest = readGuestBinder()
  // Still connected while swapping, so the server copy is never persisted locally.
  useBinderStore.setState({ entries: guest.entries, wants: guest.wants, source: 'local' })
  remote = null
}
