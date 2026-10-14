import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useBinderStore } from '@/features/binder/state/binderStore'
import CardSlot from '@/features/binder/components/CardSlot'
import AddCard from '@/features/binder/components/AddCard'

/** Pockets per binder page: a 5x3 trading-card page. */
const SLOTS_PER_PAGE = 15

/** sessionStorage key so returning from a detail keeps the binder page. */
const PAGE_INDEX_STORAGE_KEY = 'binder-app:grid-page'

/**
 * Binder page (T2): renders the persisted entries as a pocket-page grid with
 * prev/next navigation. Empty slots keep the 5x3 page shape.
 */
export default function BinderPage() {
  const entries = useBinderStore((state) => state.entries)
  const [pageIndex, setPageIndex] = useState(() => {
    const stored = sessionStorage.getItem(PAGE_INDEX_STORAGE_KEY)
    return stored !== null && /^\d+$/.test(stored) ? Number(stored) : 0
  })
  const [showAdd, setShowAdd] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    sessionStorage.setItem(PAGE_INDEX_STORAGE_KEY, String(pageIndex))
  }, [pageIndex])

  const pageCount = Math.max(1, Math.ceil(entries.length / SLOTS_PER_PAGE))
  const currentPage = Math.min(pageIndex, pageCount - 1)
  const pageStart = currentPage * SLOTS_PER_PAGE
  const pageEntries = entries.slice(pageStart, pageStart + SLOTS_PER_PAGE)
  const emptySlotCount = SLOTS_PER_PAGE - pageEntries.length
  const addCardModal = showAdd ? <AddCard onClose={() => setShowAdd(false)} /> : null

  // Page-change animation: the pocket board slides in, filled slots stagger in.
  // Disabled entirely under prefers-reduced-motion (Card3D already does this).
  const gridMotion =
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, x: 28 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.22, ease: 'easeOut' as const },
        }

  const slotMotion = (slotIndex: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: {
            delay: Math.min(slotIndex * 0.04, 0.5),
            duration: 0.18,
            ease: 'easeOut' as const,
          },
        }

  if (entries.length === 0) {
    return (
      <section className="page binder-page">
        <h1>Binder</h1>
        <div className="binder-empty">
          <p>Tu binder está vacío. Agrega cartas para empezar a llenar las páginas.</p>
          <button type="button" className="btn btn--primary" onClick={() => setShowAdd(true)}>Agregar carta</button>
        </div>
        {addCardModal}
      </section>
    )
  }

  return (
    <section className="page binder-page">
      <header className="binder-header">
        <h1>Binder</h1>
        <div className="binder-header-actions">
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
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setShowAdd(true)}
          >
            Agregar carta
          </button>
        </div>
      </header>
      <div className="binder-page-frame">
        <motion.ul
          key={currentPage}
          {...gridMotion}
          className="binder-grid"
          aria-label={`Página del binder ${currentPage + 1} de ${pageCount}`}
        >
          {pageEntries.map((entry, index) => (
            <motion.li
              key={entry.id}
              {...slotMotion(index)}
              className="binder-slot"
            >
              <CardSlot entry={entry} />
            </motion.li>
          ))}
          {Array.from({ length: emptySlotCount }, (_, index) =>
            index === 0 ? (
              // The first free pocket is the add shortcut; the rest keep the
              // page shape as decorative spacers.
              <li key="empty-add" className="binder-slot binder-slot--empty">
                <button
                  type="button"
                  className="binder-add-pocket"
                  onClick={() => setShowAdd(true)}
                  aria-label="Agregar una carta en este espacio"
                >
                  <span aria-hidden="true">+</span>
                </button>
              </li>
            ) : (
              <li key={`empty-${index}`} className="binder-slot binder-slot--empty" aria-hidden="true">
                <span className="binder-empty-pocket" />
              </li>
            ),
          )}
        </motion.ul>
      </div>
      {addCardModal}
    </section>
  )
}
