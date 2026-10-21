import { toast } from 'react-toastify'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import { BINDER_STORAGE_KEY, useBinderStore } from '@/features/binder/state/binderStore'
import { apiBinderPort } from '@/shared/api/apiBinderPort'
import type { BinderEntry, WantEntry } from '@/shared/types/mtg'

/** The binder this browser kept in localStorage before the user had an account. */
export function readLegacyBinder(): { entries: BinderEntry[]; wants: WantEntry[] } | null {
  try {
    const raw = localStorage.getItem(BINDER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: { entries?: unknown; wants?: unknown } }
    const entries = Array.isArray(parsed.state?.entries) ? (parsed.state.entries as BinderEntry[]) : []
    const wants = Array.isArray(parsed.state?.wants) ? (parsed.state.wants as WantEntry[]) : []
    return entries.length + wants.length > 0 ? { entries, wants } : null
  } catch {
    return null
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Upload the legacy localStorage binder into the signed-in account, once.
 * The local copy is removed only after the server confirmed the import, so a
 * failure never loses data; re-importing is safe (the API skips duplicates).
 */
async function importLegacyBinder(): Promise<void> {
  const legacy = readLegacyBinder()
  if (!legacy) return
  try {
    const report = await apiBinderPort.importLocal(legacy)
    localStorage.removeItem(BINDER_STORAGE_KEY)
    const { entries, wants } = report.imported
    const notImported = report.skipped.filter((s) => s.reason !== 'already_imported').length
    if (entries + wants > 0) {
      toast.success(
        `Se importaron ${plural(entries, 'carta', 'cartas')} y ${plural(wants, 'deseo', 'deseos')} de este navegador a tu cuenta.`,
      )
    }
    if (notImported > 0) {
      toast.warn(`${plural(notImported, 'elemento no se pudo', 'elementos no se pudieron')} importar.`)
    }
  } catch {
    toast.warn('No se pudo importar el binder de este navegador. Se volverá a intentar la próxima vez.')
  }
}

/** Load the signed-in user's binder from the API; ignores the result if the user changed meanwhile. */
async function loadBinder(userId: string): Promise<void> {
  await importLegacyBinder()
  try {
    const [entries, wants] = await Promise.all([apiBinderPort.listEntries(), apiBinderPort.listWants()])
    if (useSessionStore.getState().user?.id !== userId) return
    useBinderStore.getState().replaceAll({ entries, wants })
  } catch {
    toast.error('No se pudo cargar tu binder. Recarga la página para reintentar.')
  }
}

/**
 * API mode: keep the binder in step with the session. Signing in loads that
 * user's binder (importing this browser's local one first); signing out
 * empties it so the next person on this device never sees it.
 * Returns the unsubscribe function.
 */
export function startBinderSync(): () => void {
  let currentId: string | null = null
  const onUser = (userId: string | null) => {
    if (userId === currentId) return
    currentId = userId
    if (userId) void loadBinder(userId)
    else useBinderStore.getState().clear()
  }
  onUser(useSessionStore.getState().user?.id ?? null)
  return useSessionStore.subscribe((state) => onUser(state.user?.id ?? null))
}
