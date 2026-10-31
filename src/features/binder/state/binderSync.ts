import { toast } from 'react-toastify'
import { create } from 'zustand'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import {
  BINDER_STORAGE_KEY,
  type BinderPersistedState,
  mirrorServerBinder,
  readGuestBinder,
  restoreGuestBinder,
} from '@/features/binder/state/binderStore'
import { apiConfigured } from '@/shared/api/apiClient'
import { apiBinderPort, type BinderPort, type ImportReport } from '@/shared/api/binderPort'

/** Guest data this browser holds that the signed-in user may import, or `null`. */
export const useImportOfferStore = create<{ pending: BinderPersistedState | null }>()(() => ({
  pending: null,
}))

/** Skips that do not lose data: the item is already on the server. */
const HARMLESS_SKIPS = new Set(['already_imported', 'id_taken'])

let activePort: BinderPort = apiBinderPort
let generation = 0

async function loadServerBinder(port: BinderPort): Promise<BinderPersistedState> {
  const [entries, wants] = await Promise.all([port.listEntries(), port.listWants()])
  return { entries, wants }
}

/** Connect the store to the server copy; a failed write reloads the truth from the server. */
function connect(data: BinderPersistedState, port: BinderPort): void {
  mirrorServerBinder(data, {
    port,
    onWriteError: () => {
      toast.error('No se pudo guardar el cambio en el servidor.')
      const current = generation
      void loadServerBinder(port)
        .then((fresh) => {
          if (current === generation) connect(fresh, port)
        })
        .catch(() => {})
    },
  })
}

async function onSignIn(port: BinderPort): Promise<void> {
  const current = generation
  const guest = readGuestBinder()
  try {
    const data = await loadServerBinder(port)
    if (current !== generation) return
    connect(data, port)
    const hasGuestData = guest.entries.length > 0 || guest.wants.length > 0
    useImportOfferStore.setState({ pending: hasGuestData ? guest : null })
  } catch {
    if (current === generation) toast.error('No se pudo cargar tu carpeta del servidor.')
  }
}

function onSignOut(): void {
  restoreGuestBinder()
  useImportOfferStore.setState({ pending: null })
}

/**
 * Keep the binder store in step with the session: signed in, the binder is
 * the user's server copy (binder-api); signed out, it is the guest binder in
 * this browser. Returns a function that stops listening.
 */
export function startBinderSync(
  { port = apiBinderPort, enabled = apiConfigured }: { port?: BinderPort; enabled?: boolean } = {},
): () => void {
  if (!enabled) return () => {}
  activePort = port
  let userId = useSessionStore.getState().user?.id ?? null
  if (userId) void onSignIn(port)

  const unsubscribe = useSessionStore.subscribe((state) => {
    const next = state.user?.id ?? null
    if (next === userId) return
    userId = next
    generation += 1
    if (next) void onSignIn(port)
    else onSignOut()
  })

  return () => {
    unsubscribe()
    generation += 1
    restoreGuestBinder()
    useImportOfferStore.setState({ pending: null })
  }
}

/**
 * Upload the guest binder to the signed-in account, then show the server copy.
 * The local copy is removed only when nothing was lost (every item imported or
 * already on the server), so a failed or partial import never deletes data.
 */
export async function importLocalBinder(port: BinderPort = activePort): Promise<ImportReport> {
  const pending = useImportOfferStore.getState().pending
  if (!pending) return { imported: { entries: 0, wants: 0 }, skipped: [] }
  const current = generation
  const report = await port.importLocal({ entries: pending.entries, wants: pending.wants })
  if (report.skipped.every((skip) => HARMLESS_SKIPS.has(skip.reason))) {
    localStorage.removeItem(BINDER_STORAGE_KEY)
  }
  useImportOfferStore.setState({ pending: null })
  const fresh = await loadServerBinder(port)
  if (current === generation) connect(fresh, port)
  return report
}

/** Hide the offer for now; the guest binder stays in this browser. */
export function dismissImportOffer(): void {
  useImportOfferStore.setState({ pending: null })
}
