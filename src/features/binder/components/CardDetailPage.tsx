import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useBinderStore } from '@/features/binder/state/binderStore'
import { usePrinting } from '@/features/catalog/catalogQueries'
import CardDetail from '@/features/binder/components/CardDetail'

/**
 * Card detail page (`/card/:entryId`). Resolves the binder entry from the store
 * and its printing from the catalog, then delegates presentation to
 * `CardDetail`. Handles not-found, loading and error states locally.
 */
export default function CardDetailPage() {
  const { entryId } = useParams<{ entryId: string }>()
  const entry = useBinderStore((state) => state.entries.find((item) => item.id === entryId))
  const updateEntryDetails = useBinderStore((state) => state.updateEntryDetails)
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

  return (
    <motion.section
      className="page card-detail-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, delay: 0.08, ease: 'easeOut' }}
    >
      <h1>Detalle de carta</h1>
      <Link to="/" className="card-detail-back">← Volver al binder</Link>
      <CardDetail
        entry={entry}
        printing={printing}
        onSaveDetails={(patch) => updateEntryDetails(entry.id, patch)}
      />
    </motion.section>
  )
}
