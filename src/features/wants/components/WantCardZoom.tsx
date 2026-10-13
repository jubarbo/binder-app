import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import type { OracleCard } from '@/shared/types/mtg'

interface WantCardZoomProps {
  card: OracleCard
  onClose: () => void
}

/**
 * Full-screen zoom over a verified card: the image large and static (no
 * rocking), portaled to `document.body` so it is a true modal no matter
 * where the page is scrolled or transformed. A semi-opaque scrim partially
 * hides the page behind it; any click on the scrim closes the modal, as do
 * Escape and the close button, all wrapped in a fade-out transition.
 * Focus moves into the dialog on mount and is restored on unmount.
 */
export default function WantCardZoom({ card, onClose }: WantCardZoomProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Move focus into the dialog on mount and restore it on unmount.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  return createPortal(
    <motion.div
      className="want-zoom-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        className="want-zoom-panel"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <div className="want-zoom-header">
          <h2 id={titleId}>{card.name}</h2>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <img
          className="want-zoom-img"
          src={card.imageNormal}
          alt={card.name}
          draggable={false}
        />
        {card.typeLine && <p className="want-zoom-type">{card.typeLine}</p>}
      </motion.div>
    </motion.div>,
    document.body,
  )
}
