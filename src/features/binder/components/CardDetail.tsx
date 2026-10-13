import { useState } from 'react'
import type { BinderEntry, Finish, Printing } from '@/shared/types/mtg'

interface CardDetailProps {
  entry: BinderEntry
  printing?: Printing
  /** Patches the entry's editable details (wired to the store by the page). */
  onSaveDetails?: (patch: { finish?: Finish; notes?: string }) => void
}

const FINISH_LABELS: Record<Finish, string> = {
  nonfoil: 'Nonfoil',
  foil: 'Foil',
  etched: 'Etched',
}
const KNOWN_FINISHES = Object.keys(FINISH_LABELS) as Finish[]

/**
 * Pure presentation for a binder entry's detail: the enlarged printing image
 * plus its metadata, and inline editing of the copy's own details (finish and
 * notes). Data resolution and routing live in `CardDetailPage`.
 */
export default function CardDetail({ entry, printing, onSaveDetails }: CardDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftFinish, setDraftFinish] = useState<Finish | ''>('')
  const [draftNotes, setDraftNotes] = useState('')

  // Only finishes the printing actually has are offered: the copy cannot
  // declare a finish that does not exist for this physical card.
  const availableFinishes = (printing?.finishes ?? []).filter(
    (f): f is Finish => (KNOWN_FINISHES as string[]).includes(f),
  )

  const startEdit = () => {
    setDraftFinish(entry.finish ?? '')
    setDraftNotes(entry.notes ?? '')
    setIsEditing(true)
  }

  // A foil copy is priced with the foil market value when Scryfall has one.
  const price =
    printing?.prices &&
    (entry.finish === 'foil'
      ? printing.prices.usdFoil ?? printing.prices.usd
      : printing.prices.usd)

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
                <dd>{price || 'N/A'}</dd>
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
          <dt>Acabado:</dt>
          <dd>{entry.finish ? FINISH_LABELS[entry.finish] : 'No declarado'}</dd>
        </div>
        <div className="card-detail-row">
          <dt>Notas:</dt>
          <dd>{entry.notes || '—'}</dd>
        </div>
        <div className="card-detail-row">
          <dt>Para intercambio:</dt>
          <dd>{entry.forTrade ? 'Sí' : 'No'}</dd>
        </div>
      </dl>
      {isEditing ? (
        <div className="card-detail-edit">
          <select
            className="field"
            aria-label="Acabado"
            value={draftFinish}
            onChange={(e) => setDraftFinish(e.target.value as Finish | '')}
          >
            <option value="">No declarado</option>
            {availableFinishes.map((f) => (
              <option key={f} value={f}>
                {FINISH_LABELS[f]}
              </option>
            ))}
          </select>
          <textarea
            className="field"
            aria-label="Notas"
            rows={3}
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
          />
          <div className="card-detail-edit-actions">
            <button
              className="btn btn--primary"
              onClick={() => {
                onSaveDetails?.({
                  finish: draftFinish || undefined,
                  notes: draftNotes,
                })
                setIsEditing(false)
              }}
            >
              Guardar
            </button>
            <button className="btn btn--ghost" onClick={() => setIsEditing(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn--ghost card-detail-edit-trigger"
          onClick={startEdit}
        >
          Editar
        </button>
      )}
    </div>
  )
}
