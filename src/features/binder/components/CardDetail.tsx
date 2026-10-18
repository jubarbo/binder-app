import { useState } from 'react'
import { motion, AnimatePresence, useTransform } from 'motion/react'
import { useCardRock } from '@/shared/hooks/useCardRock'
import CardZoom from '@/shared/components/CardZoom'
import CardFlip from '@/shared/components/CardFlip'
import FoilLayer from '@/shared/components/FoilLayer'
import WhoWants from '@/features/binder/components/WhoWants'
import type { BinderEntry, Finish, Printing } from '@/shared/types/mtg'

interface CardDetailProps {
  entry: BinderEntry
  printing?: Printing
  /**
   * Persists the copy's own details (wired to the store by the page). The
   * finish and the for-trade flag are carried only when the edit actually
   * changed them, so a save that never touches them cannot rewrite — or
   * invent — a declaration.
   */
  onSaveDetails?: (patch: { notes: string; finish?: Finish; forTrade?: boolean }) => void
  /** Persists the copy's new quantity. Never called with 0. */
  onSaveQuantity?: (quantity: number) => void
  /** Asked when the edit would leave the quantity at 0: the copy is removed. */
  onRequestRemoval?: () => void
}

const FINISH_LABELS: Record<Finish, string> = {
  nonfoil: 'Nonfoil',
  foil: 'Foil',
  etched: 'Etched',
}

interface CardDetailMediaProps {
  printing?: Printing
  /** The copy is declared foil: the surface carries the holographic layer. */
  isFoil?: boolean
}

/**
 * The enlarged printing laid on the table: the same rocking physics as the
 * binder grid and the wants preview, at detail scale. Reduced motion keeps
 * it fully static, like every other card surface in the app.
 */
function CardDetailMedia({ printing, isFoil }: CardDetailMediaProps) {
  const { ref, style, handlers, glareStyle, rockX, rockY } = useCardRock()
  // Same pointer-linked slide the grid uses, so the band travels under the
  // cursor while the card rocks. Declared above the early return: hooks never
  // run conditionally.
  const foilX = useTransform(rockX, [-100, 100], ['14%', '-14%'])
  const foilY = useTransform(rockY, [-100, 100], ['14%', '-14%'])
  const [zoomOpen, setZoomOpen] = useState(false)

  if (!printing) {
    return (
      <span
        className="card-detail-image card-detail-image--placeholder"
        role="img"
        aria-label="Sin imagen disponible"
      />
    )
  }

  const src = printing.imageLarge || printing.imageNormal || printing.imageSmall
  // Mirror the front's fallback chain so the back matches its resolution.
  const backSrc = printing.imageLargeBack || printing.imageNormalBack
  const label = `${printing.setName} #${printing.collectorNumber}`

  // The back face mirrors the front: the card image plus the same foil, so the
  // finish rides along when the card turns instead of floating fixed on top.
  const backFace = backSrc ? (
    <>
      <img
        className="card-detail-image card-detail-image--back"
        src={backSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      {isFoil && <FoilLayer x={foilX} y={foilY} />}
    </>
  ) : undefined

  return (
    <>
      <motion.div
        ref={ref}
        className="card-detail-media-card"
        style={style}
        {...handlers}
        role="button"
        tabIndex={0}
        aria-label={`Ampliar ${label}`}
        onClick={(e) => {
          // Browsers focus a focusable element on click and jsdom does not,
          // and the zoom restores focus to this element when it closes.
          e.currentTarget.focus()
          setZoomOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setZoomOpen(true)
          }
        }}
      >
        <div className="card-detail-frame">
          <CardFlip back={backFace}>
            <>
              <img className="card-detail-image" src={src} alt={label} draggable={false} />
              {isFoil && <FoilLayer x={foilX} y={foilY} />}
            </>
          </CardFlip>
        </div>
        {glareStyle && (
          <div className="card-glare" style={{ background: glareStyle }} />
        )}
      </motion.div>
      <AnimatePresence>
        {zoomOpen && (
          <CardZoom
            src={src}
            srcBack={backSrc}
            alt={label}
            foil={isFoil}
            onClose={() => setZoomOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

/**
 * Pure presentation for a binder entry's detail: the enlarged printing image
 * plus its metadata, and inline editing of the copy's own details (finish,
 * notes and the for-trade flag). Data resolution and routing live in
 * `CardDetailPage`.
 */
export default function CardDetail({
  entry,
  printing,
  onSaveDetails,
  onSaveQuantity,
  onRequestRemoval,
}: CardDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftNotes, setDraftNotes] = useState('')
  const [draftQuantity, setDraftQuantity] = useState(1)
  const [draftFoil, setDraftFoil] = useState(false)
  const [draftForTrade, setDraftForTrade] = useState(false)

  const startEdit = () => {
    setDraftNotes(entry.notes ?? '')
    setDraftQuantity(entry.quantity)
    setDraftFoil(entry.finish === 'foil')
    setDraftForTrade(entry.forTrade)
    setIsEditing(true)
  }

  // A cleared input reads NaN: saving is blocked rather than silently
  // guessing a quantity, and 0 only exists as "I no longer own this copy".
  const clampedQuantity = Number.isFinite(draftQuantity)
    ? Math.min(99, Math.max(0, Math.round(draftQuantity)))
    : null

  const save = () => {
    if (clampedQuantity === null) return
    // Quantity zero is not a quantity: it asks for a confirmed removal
    // instead of persisting a zero the binder would render forever.
    if (clampedQuantity === 0) {
      onRequestRemoval?.()
      return
    }
    // The finish and the for-trade flag ride along only when the edit
    // actually changed them: a patch that carried them unconditionally would
    // turn an undeclared copy into `nonfoil`, or rewrite trade semantics,
    // the first time anyone edits its notes.
    const patch: { notes: string; finish?: Finish; forTrade?: boolean } = {
      notes: draftNotes,
    }
    const isFoil = entry.finish === 'foil'
    if (draftFoil !== isFoil) patch.finish = draftFoil ? 'foil' : 'nonfoil'
    if (draftForTrade !== entry.forTrade) patch.forTrade = draftForTrade
    onSaveDetails?.(patch)
    onSaveQuantity?.(clampedQuantity)
    setIsEditing(false)
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
        <CardDetailMedia printing={printing} isFoil={entry.finish === 'foil'} />
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
          <textarea
            className="field"
            aria-label="Notas"
            rows={3}
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
          />
          <input
            type="number"
            aria-label="Cantidad"
            min={0}
            max={99}
            value={Number.isFinite(draftQuantity) ? draftQuantity : ''}
            onChange={(e) =>
              // An empty field is not a zero: it must block the save, not ask
              // for a removal the user never requested.
              setDraftQuantity(e.target.value === '' ? Number.NaN : Number(e.target.value))
            }
            className="field card-detail-edit-quantity"
          />
          <label className="card-detail-edit-check">
            <input
              type="checkbox"
              checked={draftFoil}
              onChange={(e) => setDraftFoil(e.target.checked)}
            />
            Foil
          </label>
          <label className="card-detail-edit-check">
            <input
              type="checkbox"
              checked={draftForTrade}
              onChange={(e) => setDraftForTrade(e.target.checked)}
            />
            Para intercambio
          </label>
          <div className="card-detail-edit-actions">
            <button
              className="btn btn--primary"
              onClick={save}
              disabled={clampedQuantity === null}
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
      {printing && <WhoWants oracleId={printing.oracleId} entryId={entry.id} />}
    </div>
  )
}
