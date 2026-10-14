import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'

interface ConfirmDialogProps {
  message: string
  confirmLabel?: string
  rejectLabel?: string
  onConfirm: () => void
  onReject: () => void
}

/**
 * Blocking confirmation for a destructive action. Same choreography as the
 * other overlays: portaled to document.body, semi-opaque scrim, panel scale
 * and fade. Escape, scrim click and the reject button cancel; the confirm
 * button executes. Focus moves into the dialog on mount and is restored on
 * unmount. Callers own the mounting (and `AnimatePresence`, for the exit).
 */
export default function ConfirmDialog({
  message,
  confirmLabel = 'Confirmar',
  rejectLabel = 'Rechazar',
  onConfirm,
  onReject,
}: ConfirmDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  return createPortal(
    <motion.div
      className="confirm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onReject}
    >
      <motion.div
        ref={dialogRef}
        className="confirm-panel"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onReject()
        }}
      >
        <p id={titleId} className="confirm-text">
          {message}
        </p>
        <div className="confirm-actions">
          <button type="button" className="btn btn--primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onReject}>
            {rejectLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
