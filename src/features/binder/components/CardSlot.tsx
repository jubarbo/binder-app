import { useState } from 'react'
import type { BinderEntry } from '../../../shared/types/mtg'
import { usePrinting } from '../../catalog/catalogQueries'

interface CardSlotProps {
  /** The physical printing the user owns in this pocket. */
  entry: BinderEntry
}

function cardAltText(entry: BinderEntry, setName: string, collectorNumber: string): string {
  if (setName && collectorNumber) return `${setName} #${collectorNumber}`
  return `Card printing ${entry.printingId}`
}

/**
 * A single binder pocket. Presentational: it renders one `BinderEntry` by
 * resolving its physical printing from the catalog. Loading, error and ready
 * states are self-contained so a failed printing never breaks its page.
 */
export default function CardSlot({ entry }: CardSlotProps) {
  const { data: printing, isPending, isError } = usePrinting(entry.printingId)
  // Tracks whether the high-resolution image has painted yet, so the small
  // image can stand in while it loads.
  const [normalLoaded, setNormalLoaded] = useState(false)

  if (isPending) {
    return (
      <div className="card-slot card-slot--loading" aria-busy="true" aria-label="Loading card">
        <span className="card-skeleton" />
      </div>
    )
  }

  if (isError || !printing) {
    return (
      <div className="card-slot card-slot--error" role="img" aria-label="Card failed to load">
        <span className="card-slot-error-mark">?</span>
        <span className="card-slot-error-id">{entry.printingId}</span>
      </div>
    )
  }

  const hasSmall = printing.imageSmall.length > 0
  const hasNormal = printing.imageNormal.length > 0
  const alt = cardAltText(entry, printing.setName, printing.collectorNumber)

  return (
    <figure className={`card-slot card-slot--ready${entry.quantity > 1 ? ' card-slot--stacked' : ''}`}>
      <span className="card-image-frame">
        {hasSmall && (
          <img
            className="card-image card-image--placeholder"
            src={printing.imageSmall}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        )}
        {hasNormal ? (
          <img
            className="card-image card-image--full"
            src={printing.imageNormal}
            alt={alt}
            loading="lazy"
            draggable={false}
            data-loaded={normalLoaded || !hasSmall}
            onLoad={() => setNormalLoaded(true)}
          />
        ) : (
          !hasSmall && <span className="card-slot-error-mark">No image</span>
        )}
      </span>
      {entry.quantity > 1 && (
        <span className="card-quantity-badge" aria-label={`Quantity ${entry.quantity}`}>
          {entry.quantity}
        </span>
      )}
    </figure>
  )
}
