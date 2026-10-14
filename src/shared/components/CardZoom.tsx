import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import FoilLayer from '@/shared/components/FoilLayer'

interface CardZoomProps {
  /** Visible header title; it doubles as the dialog's accessible name. Omit it for an image-only modal. */
  title?: string
  /** Large image source. */
  src: string
  /** Alt text for the enlarged image, and the dialog's accessible name when there is no title. */
  alt: string
  /** Optional caption rendered under the image. */
  caption?: string
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
 * semi-opaque scrim partially hides the page behind; any click on it closes
 * the modal, as does Escape, all inside a fade-out transition. Focus moves
 * into the dialog on mount and is restored on unmount.
 *
 * With a `title` the modal shows a header holding it plus a close button;
 * without one it is image-only, named by its `alt`, and Escape or the scrim
 * are the way out. Shared by the wants list (titled) and the binder card
 * detail (image-only); only the binder copy can carry `foil`, because a want
 * has no declared finish.
 */
export default function CardZoom({
  title,
  src,
  alt,
  caption,
  foil,
  onClose,
}: CardZoomProps) {
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
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : alt}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        {title && (
          <div className="zoom-header">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}
        <div className="zoom-frame">
          <img className="zoom-img" src={src} alt={alt} draggable={false} />
          {foil && <FoilLayer />}
        </div>
        {caption && <p className="zoom-type">{caption}</p>}
      </motion.div>
    </motion.div>,
    document.body,
  )
}
