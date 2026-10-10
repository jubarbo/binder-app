import type { BinderEntry, WantEntry } from '../types/mtg'

/** Storage key shared by every binder persistence implementation. */
export const BINDER_STORAGE_KEY = 'binder-app:binder:v1'

/** Schema version of the persisted binder payload. */
export const BINDER_STORAGE_VERSION = 1

/** Full persisted binder payload. */
export interface BinderSnapshot {
  entries: BinderEntry[]
  wants: WantEntry[]
}

/**
 * Persistence seam for the user's binder. `load`/`save` are async so the
 * localStorage implementation can be swapped for a backend API later without
 * changing callers.
 */
export interface BinderPort {
  load(): Promise<BinderSnapshot>
  save(snapshot: BinderSnapshot): Promise<void>
}

/** Create a fresh, empty binder snapshot. */
export function createEmptyBinder(): BinderSnapshot {
  return { entries: [], wants: [] }
}
