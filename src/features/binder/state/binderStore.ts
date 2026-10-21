import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { toast } from 'react-toastify'
import { apiConfigured } from '@/shared/api/apiClient'
import { apiBinderPort, type BinderEntryPatch } from '@/shared/api/apiBinderPort'
import type { BinderEntry, Finish, WantEntry } from '@/shared/types/mtg'

/** Binder persistence storage key (zustand persist). */
export const BINDER_STORAGE_KEY = 'binder-app:binder:v1'

/** Schema version of the persisted binder payload. */
const BINDER_STORAGE_VERSION = 1

/** Persisted slice of the binder state (serializable, no actions). */
interface BinderPersistedState {
  entries: BinderEntry[]
  wants: WantEntry[]
}

/** Full store contract: persisted data plus actions. */
interface BinderState extends BinderPersistedState {
  addEntry: (entry: BinderEntry) => void
  removeEntry: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  toggleForTrade: (id: string) => void
  /** Patch the editable details (finish, notes) of one entry. */
  updateEntryDetails: (
    id: string,
    patch: { finish?: Finish; notes?: string },
  ) => void
  addWant: (want: WantEntry) => void
  removeWant: (id: string) => void
  /** Replace the whole binder with the server's copy (API mode, on sign-in). */
  replaceAll: (data: BinderPersistedState) => void
  /** Empty the binder (API mode, on sign-out: the next user must not see it). */
  clear: () => void
}

/**
 * With binder-api the server owns the binder, so nothing is written to
 * localStorage. The legacy payload under BINDER_STORAGE_KEY is left untouched
 * until it is imported into the user's account (see binderSync).
 */
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

/**
 * Optimistic remote write (API mode only): the UI already changed; if the
 * server refuses, undo that one change and tell the user. Local mode skips it.
 */
function syncRemote(call: () => Promise<unknown>, rollback: () => void): void {
  if (!apiConfigured) return
  call().catch(() => {
    rollback()
    toast.error('No se pudo guardar el cambio. Revisa tu conexión e intenta de nuevo.')
  })
}

/** Optional fields set to `undefined` are sent as `null` so the server clears them. */
function toEntryPatch(patch: { finish?: Finish; notes?: string }): BinderEntryPatch {
  const out: BinderEntryPatch = {}
  if ('finish' in patch) out.finish = patch.finish ?? null
  if ('notes' in patch) out.notes = patch.notes || null
  return out
}

/**
 * Client-side binder state. Local mode: persisted to localStorage behind a
 * versioned key. API mode (VITE_API_URL): mirrors the signed-in user's binder
 * on binder-api, applying every change optimistically.
 */
export const useBinderStore = create<BinderState>()(
  persist(
    (set, get) => {
      /** Put back the previous version of one entry (or remove it if it did not exist). */
      const restoreEntry = (id: string, previous: BinderEntry | undefined, index = -1) =>
        set((state) => {
          const others = state.entries.filter((entry) => entry.id !== id)
          if (!previous) return { entries: others }
          const at = index >= 0 ? Math.min(index, others.length) : state.entries.findIndex((e) => e.id === id)
          const entries = [...others]
          entries.splice(at < 0 ? entries.length : at, 0, previous)
          return { entries }
        })

      const patchEntry = (id: string, change: (entry: BinderEntry) => BinderEntry, remote: BinderEntryPatch) => {
        const previous = get().entries.find((entry) => entry.id === id)
        if (!previous) return
        set((state) => ({
          entries: state.entries.map((entry) => (entry.id === id ? change(entry) : entry)),
        }))
        syncRemote(
          () => apiBinderPort.updateEntry(id, remote),
          () => restoreEntry(id, previous),
        )
      }

      return {
        entries: [],
        wants: [],

        addEntry: (entry) => {
          set((state) => ({ entries: [...state.entries, entry] }))
          syncRemote(
            () => apiBinderPort.addEntry(entry),
            () => restoreEntry(entry.id, undefined),
          )
        },

        removeEntry: (id) => {
          const index = get().entries.findIndex((entry) => entry.id === id)
          const previous = get().entries[index]
          set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) }))
          if (previous) {
            syncRemote(
              () => apiBinderPort.removeEntry(id),
              () => restoreEntry(id, previous, index),
            )
          }
        },

        updateQuantity: (id, quantity) => {
          const next = Math.max(0, quantity)
          patchEntry(id, (entry) => ({ ...entry, quantity: next }), { quantity: next })
        },

        toggleForTrade: (id) => {
          const current = get().entries.find((entry) => entry.id === id)
          if (!current) return
          patchEntry(id, (entry) => ({ ...entry, forTrade: !entry.forTrade }), {
            forTrade: !current.forTrade,
          })
        },

        updateEntryDetails: (id, patch) =>
          patchEntry(id, (entry) => ({ ...entry, ...patch }), toEntryPatch(patch)),

        addWant: (want) => {
          set((state) => ({ wants: [...state.wants, want] }))
          syncRemote(
            () => apiBinderPort.addWant(want),
            () => set((state) => ({ wants: state.wants.filter((w) => w.id !== want.id) })),
          )
        },

        removeWant: (id) => {
          const index = get().wants.findIndex((want) => want.id === id)
          const previous = get().wants[index]
          set((state) => ({ wants: state.wants.filter((want) => want.id !== id) }))
          if (previous) {
            syncRemote(
              () => apiBinderPort.removeWant(id),
              () =>
                set((state) => {
                  if (state.wants.some((w) => w.id === id)) return state
                  const wants = [...state.wants]
                  wants.splice(Math.min(index, wants.length), 0, previous)
                  return { wants }
                }),
            )
          }
        },

        replaceAll: ({ entries, wants }) => set({ entries, wants }),

        clear: () => set({ entries: [], wants: [] }),
      }
    },
    {
      name: BINDER_STORAGE_KEY,
      version: BINDER_STORAGE_VERSION,
      storage: createJSONStorage(() => (apiConfigured ? noopStorage : localStorage)),
      // Actions are functions and are dropped by JSON serialization anyway;
      // persisting the data slice explicitly keeps the envelope stable.
      partialize: (state): BinderPersistedState => ({
        entries: state.entries,
        wants: state.wants,
      }),
    },
  ),
)
