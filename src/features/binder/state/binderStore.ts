import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BINDER_STORAGE_KEY, BINDER_STORAGE_VERSION } from '../../../shared/api/binderPort'
import type { BinderEntry, WantEntry } from '../../../shared/types/mtg'

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