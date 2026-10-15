import ConfirmDialog from '@/shared/components/ConfirmDialog'
import type { WantEntry } from '@/shared/types/mtg'

interface WantRemoveConfirmProps {
  want: WantEntry
  onConfirm: () => void
  onReject: () => void
}

/**
 * Removing a want: the shared confirmation dialog carrying the wants copy.
 * Escape, scrim click and "Rechazar" reject the removal; "Confirmar" executes
 * it. The copy is fixed by product decision and must not be reworded.
 */
export default function WantRemoveConfirm({
  want,
  onConfirm,
  onReject,
}: WantRemoveConfirmProps) {
  const name = want.name ?? want.oracleId

  return (
    <ConfirmDialog
      message={`Seguro quieres retirar ${name} de tu lista de Deseos?`}
      onConfirm={onConfirm}
      onReject={onReject}
    />
  )
}
