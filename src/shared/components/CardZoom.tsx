import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import FoilLayer from '@/shared/components/FoilLayer'

interface CardZoomProps {
  /** Large image source. */
  src: string
  /** Alt text for the enlarged image, and the dialog's accessible name. */
  alt: string
  /**
   * Paints the holographic layer over the image. Binder copies only: a want is
   * an oracle-level desire with no declared finish, so it never asks for one.
   */
  foil?: boolean
  onClose: () => void
}

/**
 * Full-screen zoom over a card: the image large and static (no rocking),
 * portaled to `document.body` so it is a true modal wherever the page sits. A
 * semi-opaque scrim partially hides the page behind; any click on it closes the
 * modal, as does Escape, all inside a fade-out transition. Focus moves
 * into the dialog on mount and is restored on unmount.
 *
 * Image-only by design: no header, no close button and no caption — the card's
 * name and type line already sit in the list item and the preview that opened
 * it, so the modal carries nothing but the art. Escape or the scrim close it.
 * Shared by the wants list and the binder card detail; only the binder copy
 * can carry `foil`, because a want has no declared finish.
 */
export default function CardZoom({ src, alt, foil, onClose }: CardZoomProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Move focus into the dialog on mount and restore it on unmount.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  return createPortal(
    <motion.div
      className="zoom-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        className="zoom-panel"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={alt}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <div className="zoom-frame">
          <img className="zoom-img" src={src} alt={alt} draggable={false} />
          {foil && <FoilLayer />}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
