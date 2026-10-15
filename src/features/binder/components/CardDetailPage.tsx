import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'react-toastify'
import { useBinderStore } from '@/features/binder/state/binderStore'
import { usePrinting } from '@/features/catalog/catalogQueries'
import CardDetail from '@/features/binder/components/CardDetail'
import ConfirmDialog from '@/shared/components/ConfirmDialog'

/**
 * Card detail page (`/card/:entryId`). Resolves the binder entry from the store
 * and its printing from the catalog, then delegates presentation to
 * `CardDetail`. Handles not-found, loading and error states locally.
 */
export default function CardDetailPage() {
  const { entryId } = useParams<{ entryId: string }>()
  const entry = useBinderStore((state) => state.entries.find((item) => item.id === entryId))
  const updateEntryDetails = useBinderStore((state) => state.updateEntryDetails)
  const updateQuantity = useBinderStore((state) => state.updateQuantity)
  const removeEntry = useBinderStore((state) => state.removeEntry)
  const navigate = useNavigate()
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)
  const { data: printing, isPending, isError } = usePrinting(entry?.printingId ?? '')

  if (!entry) {
    return (
      <section className="page card-detail-page">
        <h1>Detalle de carta</h1>
        <p>Carta no encontrada.</p>
        <Link to="/" className="card-detail-back">← Volver al binder</Link>
      </section>
    )
  }

  if (isPending) {
    return (
      <section className="page card-detail-page">
        <h1>Detalle de carta</h1>
        <div
          className="card-detail-grid"
          aria-busy="true"
          aria-label="Cargando carta"
        >
          <span className="skeleton card-detail-skeleton-media" />
          <span className="skeleton card-detail-skeleton-meta" />
        </div>
        <Link to="/" className="card-detail-back">← Volver al binder</Link>
      </section>
    )
  }

  if (isError || !printing) {
    return (
      <section className="page card-detail-page">
        <h1>Detalle de carta</h1>
        <p>No se pudo cargar la carta.</p>
        <Link to="/" className="card-detail-back">← Volver al binder</Link>
      </section>
    )
  }

  // "<card name> — <edition>"; when the catalog hands us no name, the plain
  // "<set> #<collector number>" label still identifies the printing.
  const heading = printing.name
    ? `${printing.name}${printing.setName ? ` — ${printing.setName}` : ''}`
    : `${printing.setName} #${printing.collectorNumber}`

  return (
    <motion.section
      className="page card-detail-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, delay: 0.08, ease: 'easeOut' }}
    >
      <h1>{heading}</h1>
      <Link to="/" className="card-detail-back">← Volver al binder</Link>
      <CardDetail
        entry={entry}
        printing={printing}
        onSaveDetails={(patch) => updateEntryDetails(entry.id, patch)}
        onSaveQuantity={(quantity) => updateQuantity(entry.id, quantity)}
        onRequestRemoval={() => setConfirmingRemoval(true)}
      />
      <AnimatePresence>
        {confirmingRemoval && (
          <ConfirmDialog
            message={`Si dejas la cantidad en 0, ${printing.setName} #${printing.collectorNumber} se eliminará de tu binder.`}
            onConfirm={() => {
              removeEntry(entry.id)
              setConfirmingRemoval(false)
              toast.success('Carta eliminada')
              navigate('/', { replace: true })
            }}
            onReject={() => setConfirmingRemoval(false)}
          />
        )}
      </AnimatePresence>
    </motion.section>
  )
}
