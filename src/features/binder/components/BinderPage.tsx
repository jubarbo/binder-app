import { useState } from 'react'
import { useBinderStore } from '@/features/binder/state/binderStore'
import CardSlot from '@/features/binder/components/CardSlot'
import AddCard from '@/features/binder/components/AddCard'

/** Pockets per binder page: a 5x3 trading-card page. */
const SLOTS_PER_PAGE = 15

/**
 * Binder page (T2): renders the persisted entries as a pocket-page grid with
 * prev/next navigation. Empty slots keep the 5x3 page shape.
 */
export default function BinderPage() {
  const entries = useBinderStore((state) => state.entries)
  const [pageIndex, setPageIndex] = useState(0)
  const [showAdd, setShowAdd] = useState(false)

  const pageCount = Math.max(1, Math.ceil(entries.length / SLOTS_PER_PAGE))
  const currentPage = Math.min(pageIndex, pageCount - 1)
  const pageStart = currentPage * SLOTS_PER_PAGE
  const pageEntries = entries.slice(pageStart, pageStart + SLOTS_PER_PAGE)
  const emptySlotCount = SLOTS_PER_PAGE - pageEntries.length
  const addCardModal = showAdd ? <AddCard onClose={() => setShowAdd(false)} /> : null

  if (entries.length === 0) {
    return (
      <section className="page binder-page">
        <h1>Binder</h1>
        <div className="binder-empty">
          <p>Tu binder está vacío. Agrega cartas para empezar a llenar las páginas.</p>
          <button type="button" onClick={() => setShowAdd(true)}>Agregar carta</button>
        </div>
        {addCardModal}
      </section>
    )
  }

  return (
    <section className="page binder-page">
      <header className="binder-header">
        <h1>Binder</h1>
        {pageCount > 1 && (
          <div className="binder-nav">
            <button
              type="button"
              className="binder-nav-button"
              onClick={() => setPageIndex(currentPage - 1)}
              disabled={currentPage <= 0}
              aria-label="Página anterior"
            >
              Anterior
            </button>
            <span className="binder-page-indicator" aria-live="polite">
              Página {currentPage + 1} de {pageCount}
            </span>
            <button
              type="button"
              className="binder-nav-button"
              onClick={() => setPageIndex(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              aria-label="Página siguiente"
            >
              Siguiente
            </button>
          </div>
        )}
      </header>
      <div className="binder-page-frame">
        <ul className="binder-grid" aria-label={`Página del binder ${currentPage + 1} de ${pageCount}`}>
          {pageEntries.map((entry) => (
            <li key={entry.id} className="binder-slot">
              <CardSlot entry={entry} />
            </li>
          ))}
          {Array.from({ length: emptySlotCount }, (_, index) => (
            <li key={`empty-${index}`} className="binder-slot binder-slot--empty" aria-hidden="true">
              <span className="binder-empty-pocket" />
            </li>
          ))}
        </ul>
      </div>
      {addCardModal}
    </section>
  )
}
