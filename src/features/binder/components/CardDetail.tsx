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
    <>
      {printing && (
        <div>
          <img
            className="card-detail-image"
            src={printing.imageLarge || printing.imageNormal || printing.imageSmall}
            alt={`${printing.setName} #${printing.collectorNumber}`}
            draggable={false}
          />
          <p><strong>Nombre:</strong> {printing.setName}</p>
          <p><strong>Set:</strong> {printing.setCode} #{printing.collectorNumber}</p>
          <p><strong>Rareza:</strong> {printing.rarity}</p>
          {printing.prices && (
            <p><strong>Precio USD:</strong> {printing.prices.usd || 'N/A'}</p>
          )}
        </div>
      )}
      <div>
        <p><strong>Cantidad:</strong> {entry.quantity}</p>
        <p><strong>Condición:</strong> {entry.condition}</p>
        <p><strong>Idioma:</strong> {entry.language}</p>
        <p><strong>Para trade:</strong> {entry.forTrade ? 'Sí' : 'No'}</p>
      </div>
    </>
  )
}
