import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import type { WantEntry } from '@/shared/types/mtg'

interface WantRemoveConfirmProps {
  want: WantEntry
  onConfirm: () => void
  onReject: () => void
}

/**
 * Confirmation dialog for removing a want, mirroring the WantCardZoom
 * choreography: portaled to document.body, semi-opaque scrim, panel scale
 * and fade in/out via AnimatePresence. Escape, scrim click and "Rechazar"
 * reject the removal; "Confirmar" executes it. Focus moves into the dialog
 * on mount and is restored on unmount.
 */
export default function WantRemoveConfirm({
  want,
  onConfirm,
  onReject,
}: WantRemoveConfirmProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const name = want.name ?? want.oracleId

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  return createPortal(
    <motion.div
      className="want-confirm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onReject}
    >
      <motion.div
        ref={dialogRef}
        className="want-confirm-panel"
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
        <p id={titleId} className="want-confirm-text">
          Seguro quieres retirar {name} de tu lista de Deseos?
        </p>
        <div className="want-confirm-actions">
          <button type="button" className="btn btn--primary" onClick={onConfirm}>
            Confirmar
          </button>
          <button type="button" className="btn btn--ghost" onClick={onReject}>
            Rechazar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
