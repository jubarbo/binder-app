import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BinderEntry, Finish, WantEntry } from '@/shared/types/mtg'

/** Binder persistence storage key (zustand persist). */
const BINDER_STORAGE_KEY = 'binder-app:binder:v1'

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
  /** Patch the editable details (finish, notes, for-trade) of one entry. */
  updateEntryDetails: (
    id: string,
    patch: { finish?: Finish; notes?: string; forTrade?: boolean },
  ) => void
  addWant: (want: WantEntry) => void
  removeWant: (id: string) => void
}

/** Client-side binder state, persisted to localStorage behind a versioned key. */
export const useBinderStore = create<BinderState>()(
  persist(
    (set) => ({
      entries: [],
      wants: [],

      addEntry: (entry) =>
        set((state) => ({ entries: [...state.entries, entry] })),

      removeEntry: (id) =>
        set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, quantity: Math.max(0, quantity) } : entry,
          ),
        })),

      toggleForTrade: (id) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, forTrade: !entry.forTrade } : entry,
          ),
        })),

      updateEntryDetails: (id, patch) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, ...patch } : entry,
          ),
        })),

      addWant: (want) =>
        set((state) => ({ wants: [...state.wants, want] })),

      removeWant: (id) =>
        set((state) => ({ wants: state.wants.filter((want) => want.id !== id) })),
    }),
    {
      name: BINDER_STORAGE_KEY,
      version: BINDER_STORAGE_VERSION,
      // Actions are functions and are dropped by JSON serialization anyway;
      // persisting the data slice explicitly keeps the envelope stable.
      partialize: (state): BinderPersistedState => ({
        entries: state.entries,
        wants: state.wants,
      }),
    },
  ),
)