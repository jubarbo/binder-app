import { apiRequest } from '@/shared/api/apiClient'
import type { BinderEntry, Finish, WantEntry } from '@/shared/types/mtg'

/** Fields of a binder entry the API lets the owner change. `null` clears an optional one. */
export interface BinderEntryPatch {
  quantity?: number
  forTrade?: boolean
  finish?: Finish | null
  notes?: string | null
}

/** What `POST /binder/import` reports back. */
export interface ImportReport {
  imported: { entries: number; wants: number }
  skipped: { kind: 'entry' | 'want'; id?: string; reason: string }[]
}

/**
 * The signed-in user's binder and wants on binder-api. Every call carries the
 * session cookie; users only ever see and change their own data.
 */
export const apiBinderPort = {
  listEntries: (signal?: AbortSignal) => apiRequest<BinderEntry[]>('/binder/entries', { signal }),
  addEntry: (entry: BinderEntry) =>
    apiRequest<BinderEntry>('/binder/entries', { method: 'POST', body: entry }),
  updateEntry: (id: string, patch: BinderEntryPatch) =>
    apiRequest<BinderEntry>(`/binder/entries/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: patch,
    }),
  removeEntry: (id: string) =>
    apiRequest<void>(`/binder/entries/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  listWants: (signal?: AbortSignal) => apiRequest<WantEntry[]>('/binder/wants', { signal }),
  addWant: (want: WantEntry) => apiRequest<WantEntry>('/binder/wants', { method: 'POST', body: want }),
  removeWant: (id: string) =>
    apiRequest<void>(`/binder/wants/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  /** Upload a localStorage binder (entries + wants); re-importing never duplicates. */
  importLocal: (payload: { entries: BinderEntry[]; wants: WantEntry[] }) =>
    apiRequest<ImportReport>('/binder/import', { method: 'POST', body: payload }),
}
