import { useState } from 'react'
import { toast } from 'react-toastify'
import {
  dismissImportOffer,
  importLocalBinder,
  useImportOfferStore,
} from '@/features/binder/state/binderSync'

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/**
 * Shown once per sign-in when this browser holds a guest binder: offers to
 * move it into the account (binder-api `POST /binder/import`).
 */
export default function ImportLocalOffer() {
  const pending = useImportOfferStore((state) => state.pending)
  const [busy, setBusy] = useState(false)
  if (!pending) return null

  const summary = [
    pending.entries.length > 0 && plural(pending.entries.length, 'carta', 'cartas'),
    pending.wants.length > 0 && plural(pending.wants.length, 'deseo', 'deseos'),
  ]
    .filter(Boolean)
    .join(' y ')

  const accept = async () => {
    setBusy(true)
    try {
      const report = await importLocalBinder()
      const imported = report.imported.entries + report.imported.wants
      const lost = report.skipped.filter(
        (skip) => skip.reason !== 'already_imported',
      ).length
      if (lost > 0) {
        toast.warning(
          `Se importaron ${imported}; ${lost} no se pudieron importar y siguen guardados en este navegador.`,
        )
      } else {
        toast.success(`Importación completa: ${imported} elementos en tu cuenta.`)
      }
    } catch {
      toast.error('No se pudo importar. Tus datos siguen guardados en este navegador.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="import-offer" role="region" aria-label="Importar carpeta local">
      <p>
        Este navegador tiene {summary} guardados sin cuenta. ¿Quieres importarlos a tu cuenta?
      </p>
      <div className="import-offer-actions">
        <button type="button" onClick={() => void accept()} disabled={busy}>
          {busy ? 'Importando…' : 'Importar'}
        </button>
        <button type="button" onClick={dismissImportOffer} disabled={busy}>
          Ahora no
        </button>
      </div>
    </section>
  )
}
