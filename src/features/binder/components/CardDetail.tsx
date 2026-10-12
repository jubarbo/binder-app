import type { BinderEntry, Printing } from '@/shared/types/mtg'

interface CardDetailProps {
  entry: BinderEntry
  printing?: Printing
  onClose?: () => void
}

export default function CardDetail({ entry, printing, onClose }: CardDetailProps) {
  return (
    <div className="add-card-overlay" onClick={onClose}>
      <div className="add-card-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Detalle de carta</h2>
        {printing && (
          <div>
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
        <button onClick={onClose}>Cerrar</button>
      </div>
    </div>
  )
}
