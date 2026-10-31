import { apiRequest } from '@/shared/api/apiClient'
import type { BinderEntry, Condition, Finish, WantEntry } from '@/shared/types/mtg'

/** Fields binder-api accepts on `PATCH /binder/entries/:id`; `null` clears an optional field. */
export interface BinderEntryPatch {
  quantity?: number
  forTrade?: boolean
  finish?: Finish | null
  notes?: string | null
  condition?: Condition
  language?: string
}

/** Why the server did not import one local item (binder-api `ImportSkip`). */
export interface ImportSkip {
  kind: 'entry' | 'want'
  id?: string
  reason:
    | 'invalid'
    | 'unknown_printing'
    | 'unknown_oracle'
    | 'printing_not_of_oracle'
    | 'already_imported'
    | 'id_taken'
  detail?: string
}

export interface ImportReport {
  imported: { entries: number; wants: number }
  skipped: ImportSkip[]
}

/** The signed-in user's binder and wants, owned by binder-api. */
export interface BinderPort {
  listEntries(signal?: AbortSignal): Promise<BinderEntry[]>
  listWants(signal?: AbortSignal): Promise<WantEntry[]>
  addEntry(entry: BinderEntry): Promise<unknown>
  patchEntry(id: string, patch: BinderEntryPatch): Promise<unknown>
  removeEntry(id: string): Promise<unknown>
  addWant(want: WantEntry): Promise<unknown>
  removeWant(id: string): Promise<unknown>
  /** Uploads the browser's guest binder (`POST /binder/import`). */
  importLocal(data: { entries: BinderEntry[]; wants: WantEntry[] }): Promise<ImportReport>
}

const IMPORT_TIMEOUT_MS = 60_000

export const apiBinderPort: BinderPort = {
  listEntries: (signal) => apiRequest<BinderEntry[]>('/binder/entries', { signal }),
  listWants: (signal) => apiRequest<WantEntry[]>('/binder/wants', { signal }),
  addEntry: (entry) => apiRequest('/binder/entries', { method: 'POST', body: entry }),
  patchEntry: (id, patch) =>
    apiRequest(`/binder/entries/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
  removeEntry: (id) => apiRequest(`/binder/entries/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  addWant: (want) => apiRequest('/binder/wants', { method: 'POST', body: want }),
  removeWant: (id) => apiRequest(`/binder/wants/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  importLocal: (data) =>
    apiRequest<ImportReport>('/binder/import', {
      method: 'POST',
      body: data,
      timeoutMs: IMPORT_TIMEOUT_MS,
    }),
}
