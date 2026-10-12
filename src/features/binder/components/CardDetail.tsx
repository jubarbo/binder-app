import type { BinderEntry, Printing } from '@/shared/types/mtg'

interface CardDetailProps {
  entry: BinderEntry
  printing?: Printing
}

/**
 * Pure presentation for a binder entry's detail: the enlarged printing image
 * plus its metadata. Data resolution and routing live in `CardDetailPage`.
 */
export default function CardDetail({ entry, printing }: CardDetailProps) {
  return (
    <div className="card-detail-grid">
      <div className="card-detail-media">
        {printing ? (
          <img
            className="card-detail-image"
            src={printing.imageLarge || printing.imageNormal || printing.imageSmall}
            alt={`${printing.setName} #${printing.collectorNumber}`}
            draggable={false}
          />
        ) : (
          <span
            className="card-detail-image card-detail-image--placeholder"
            role="img"
            aria-label="Sin imagen disponible"
          />
        )}
      </div>
      <dl className="card-detail-meta">
        {printing && (
          <>
            <div className="card-detail-row">
              <dt>Set:</dt>
              <dd>
                {printing.setName} ({printing.setCode} #{printing.collectorNumber})
              </dd>
            </div>
            <div className="card-detail-row">
              <dt>Rareza:</dt>
              <dd>{printing.rarity}</dd>
            </div>
            {printing.prices && (
              <div className="card-detail-row">
                <dt>Precio USD:</dt>
                <dd>{printing.prices.usd || 'N/A'}</dd>
              </div>
            )}
          </>
        )}
        <div className="card-detail-row">
          <dt>Cantidad:</dt>
          <dd>{entry.quantity}</dd>
        </div>
        <div className="card-detail-row">
          <dt>Condición:</dt>
          <dd>{entry.condition}</dd>
        </div>
        <div className="card-detail-row">
          <dt>Idioma:</dt>
          <dd>{entry.language}</dd>
        </div>
        <div className="card-detail-row">
          <dt>Para intercambio:</dt>
          <dd>{entry.forTrade ? 'Sí' : 'No'}</dd>
        </div>
      </dl>
    </div>
  )
}