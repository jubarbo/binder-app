import {
  BINDER_STORAGE_KEY,
  BINDER_STORAGE_VERSION,
  createEmptyBinder,
  type BinderPort,
  type BinderSnapshot,
} from './binderPort'

/**
 * The localStorage payload mirrors the zustand `persist` envelope
 * (`{ state, version }`) so this adapter and the store middleware share the
 * same key without clobbering each other's shape.
 */
interface PersistedEnvelope {
  state: BinderSnapshot
  version: number
}

function isValidSnapshot(value: unknown): value is BinderSnapshot {
  if (typeof value !== 'object' || value === null) return false
  const snapshot = value as Partial<BinderSnapshot>
  return Array.isArray(snapshot.entries) && Array.isArray(snapshot.wants)
}

/**
 * localStorage-backed `BinderPort`. Used until the real backend API exists;
 * `load`/`save` are async so callers keep working after the swap.
 */
export const localBinderAdapter: BinderPort = {
  async load(): Promise<BinderSnapshot> {
    try {
      const raw = localStorage.getItem(BINDER_STORAGE_KEY)
      if (!raw) return createEmptyBinder()
      const parsed: unknown = JSON.parse(raw)
      const snapshot = isValidSnapshot(parsed)
        ? parsed
        : isValidSnapshot((parsed as PersistedEnvelope | null)?.state)
          ? (parsed as PersistedEnvelope).state
          : undefined
      return snapshot ?? createEmptyBinder()
    } catch {
      // Unreadable or corrupt storage: start from an empty binder.
      return createEmptyBinder()
    }
  },

  async save(snapshot: BinderSnapshot): Promise<void> {
    const envelope: PersistedEnvelope = { state: snapshot, version: BINDER_STORAGE_VERSION }
    localStorage.setItem(BINDER_STORAGE_KEY, JSON.stringify(envelope))
  },
}

export default localBinderAdapter