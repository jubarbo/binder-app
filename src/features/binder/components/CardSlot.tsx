import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import type { BinderEntry } from '@/shared/types/mtg'
import { usePrinting } from '@/features/catalog/catalogQueries'
import Card3D from '@/features/binder/components/Card3D'
import { isFlightActive, useFlightStore } from '@/features/binder/transition/flightStore'

interface CardSlotProps {
  /** The physical printing the user owns in this pocket. */
  entry: BinderEntry
}

function cardAltText(entry: BinderEntry, setName: string, collectorNumber: string): string {
  if (setName && collectorNumber) return `${setName} #${collectorNumber}`
  return `Impresión ${entry.printingId}`
}

/**
 * A single binder pocket. Presentational: it renders one `BinderEntry` by
 * resolving its physical printing from the catalog. Loading, error and ready
 * states are self-contained so a failed printing never breaks its page.
 */
export default function CardSlot({ entry }: CardSlotProps) {
  const { data: printing, isPending, isError } = usePrinting(entry.printingId)
  const navigate = useNavigate()
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()
  // Tracks whether the high-resolution image has painted yet, so the small
  // image can stand in while it loads.
  const [normalLoaded, setNormalLoaded] = useState(false)

  if (isPending) {
    return (
      <div className="card-slot card-slot--loading" aria-busy="true" aria-label="Cargando carta">
        <span className="card-skeleton" />
      </div>
    )
  }

  if (isError || !printing) {
    return (
      <div className="card-slot card-slot--error" role="img" aria-label="No se pudo cargar la carta">
        <span className="card-slot-error-mark">?</span>
        <span className="card-slot-error-id">{entry.printingId}</span>
      </div>
    )
  }

  const hasSmall = printing.imageSmall.length > 0
  const hasNormal = printing.imageNormal.length > 0
  const alt = cardAltText(entry, printing.setName, printing.collectorNumber)

  const quantityBadge = entry.quantity > 1 ? (
    <span className="card-quantity-badge" aria-label={`Cantidad ${entry.quantity}`}>
      {entry.quantity}
    </span>
  ) : null

  const openDetail = (element: HTMLDivElement) => {
    // Fresh store read: rapid repeat clicks must not start a second flight,
    // even before React re-renders.
    const { flight, beginFlight } = useFlightStore.getState()
    if (isFlightActive(flight, performance.now())) return
    if (prefersReducedMotion) {
      navigate(`/card/${entry.id}`)
      return
    }
    const rect = element.getBoundingClientRect()
    beginFlight({
      entryId: entry.id,
      imageSmall: printing.imageSmall,
      // Fly with exactly what the user was already seeing: the sharp layer is
      // only carried over once the grid has hydrated it, so it can never pop
      // in mid-flight with a visible crossfade.
      imageNormal: normalLoaded ? printing.imageNormal : '',
      alt,
      start: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      locationKey: location.key,
    })
    // The route swap is scheduled by the overlay, hidden under full black.
  }

  return (
    <Card3D
      entry={entry}
      printing={printing}
      alt={alt}
      hasSmall={hasSmall}
      hasNormal={hasNormal}
      normalLoaded={normalLoaded}
      setNormalLoaded={setNormalLoaded}
      quantityBadge={quantityBadge}
      onOpenDetail={openDetail}
    />
  )
}
