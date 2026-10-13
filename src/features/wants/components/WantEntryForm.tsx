import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'motion/react'
import { useBinderStore } from '@/features/binder/state/binderStore'
import { useSearchCards, useNamed } from '@/features/catalog/catalogQueries'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { useCardRock } from '@/shared/hooks/useCardRock'
import WantCardZoom from '@/features/wants/components/WantCardZoom'
import PrintingPicker from '@/features/wants/components/PrintingPicker'
import type { OracleCard, Printing } from '@/shared/types/mtg'

const schema = z.object({
  quantity: z.coerce.number().int().min(1).max(99),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

interface Props {
  onSubmit?: () => void
}

/** Compare a card name with the current input, ignoring case and padding. */
const matchesName = (card: OracleCard, raw: string) =>
  card.name.localeCompare(raw.trim(), undefined, { sensitivity: 'base' }) === 0

interface WantPreviewCardProps {
  card: OracleCard
  onZoom: () => void
}

/**
 * The verified card laid on the table: same rocking hover as the binder
 * grid (shared `useCardRock` physics), acting as the zoom trigger.
 */
function WantPreviewCard({ card, onZoom }: WantPreviewCardProps) {
  const { ref, style, handlers, glareStyle } = useCardRock()

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onZoom()
    }
  }

  return (
    <motion.div
      ref={ref}
      className="want-preview-card"
      style={style}
      {...handlers}
      onClick={onZoom}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Ampliar ${card.name}`}
    >
      <img
        className="want-preview-img"
        src={card.imageNormal}
        alt={card.name}
        draggable={false}
      />
      {glareStyle && (
        <div className="card-glare" style={{ background: glareStyle }} />
      )}
    </motion.div>
  )
}

export default function WantEntryForm({ onSubmit }: Props) {
  const addWant = useBinderStore((s) => s.addWant)
  const wants = useBinderStore((s) => s.wants)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const [selected, setSelected] = useState<OracleCard | null>(null)
  const [verifyName, setVerifyName] = useState('')
  const [preview, setPreview] = useState<OracleCard | null>(null)
  const [printingChoice, setPrintingChoice] = useState<{
    oracleId: string
    printing: Printing
  } | null>(null)
  const [zoomOpen, setZoomOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1 },
  })

  const {
    data: searchResults,
    isPending: isSearchPending,
    isError: isSearchError,
  } = useSearchCards(debouncedQuery)
  const {
    data: verifiedCard,
    isPending: isVerifyPending,
    isError: isVerifyError,
  } = useNamed(verifyName)

  // A disabled (empty-query) TanStack query still reports `isPending`, so the
  // empty-input guard must run before the loading state is considered.
  const hasQuery = query.trim().length > 0
  const isVerifying = verifyName.length > 0 && isVerifyPending

  // The verified card becomes the preview; a failed lookup invalidates it.
  useEffect(() => {
    if (!verifyName) return
    if (verifiedCard) setPreview(verifiedCard)
    else if (isVerifyError) setPreview(null)
  }, [verifyName, verifiedCard, isVerifyError])

  // The printing choice is keyed by oracle: switching cards (or a failed
  // lookup) derives no preference, so no reset effect is needed.
  const preferredPrinting =
    printingChoice && preview && printingChoice.oracleId === preview.oracleId
      ? printingChoice.printing
      : null
  // A chosen printing swaps the preview art; name and text stay oracle-level.
  const displayCard =
    preview && preferredPrinting
      ? { ...preview, imageNormal: preferredPrinting.imageNormal }
      : preview
  // Only an oracle-level want blocks another oracle add, and only while no
  // printing is selected: picking a concrete printing always allows it
  // (exact repeats are filtered out of the picker).
  const oracleWanted =
    preview !== null &&
    wants.some(
      (w) => w.oracleId === preview.oracleId && !w.preferredPrintingId,
    )
  const addBlocked = oracleWanted && preferredPrinting === null
  const wantedPrintingIds = new Set(
    wants.flatMap((w) => (w.preferredPrintingId ? [w.preferredPrintingId] : [])),
  )
  const suggestionPicked = selected !== null && matchesName(selected, query)
  const previewIsCurrent =
    preview !== null && hasQuery && matchesName(preview, query)
  // The card already selected (picked or previewed) never reappears in the
  // suggestion list for a new query.
  const suggestions = searchResults?.filter(
    (card) =>
      card.oracleId !== preview?.oracleId &&
      card.oracleId !== selected?.oracleId,
  )
  const showSuggestions =
    hasQuery && !suggestionPicked && !previewIsCurrent &&
    (suggestions?.length ?? 0) > 0

  // Clicking a suggestion's full name verifies it right away: the card is
  // already in memory, so no extra request is needed.
  const handlePick = (card: OracleCard) => {
    setSelected(card)
    setQuery(card.name)
    setVerifyName('')
    setPreview(card)
  }

  const handleVerify = () => {
    const trimmed = query.trim()
    if (!trimmed || isVerifying) return
    // A picked suggestion is already in memory: no extra request needed.
    if (selected && matchesName(selected, trimmed)) {
      setVerifyName('')
      setPreview(selected)
      return
    }
    setVerifyName(trimmed)
  }

  const submit = (data: FormOutput) => {
    if (!displayCard || addBlocked) return
    addWant({
      id: crypto.randomUUID(),
      oracleId: displayCard.oracleId,
      // Oracle-level display snapshot: the list cannot resolve a card by
      // oracle id (no such endpoint), so name, type and image ride along.
      name: displayCard.name,
      typeLine: displayCard.typeLine,
      imageNormal: displayCard.imageNormal,
      // Optional printing refinement; the label keeps the list readable
      // without resolving the id.
      preferredPrintingId: preferredPrinting?.id,
      printingLabel: preferredPrinting
        ? `${preferredPrinting.setName} #${preferredPrinting.collectorNumber}`
        : undefined,
      quantity: data.quantity,
      priority: 'normal',
    })
    reset()
    setQuery('')
    setSelected(null)
    setVerifyName('')
    setPreview(null)
    setZoomOpen(false)
    onSubmit?.()
  }

  return (
    <>
      <form onSubmit={handleSubmit(submit)} className="want-form">
        <div className="want-search-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleVerify()
              }
            }}
            placeholder="Buscar carta..."
            aria-label="Buscar carta"
            className="field"
          />
        </div>

        {hasQuery && isSearchPending && !searchResults && (
          <div className="want-loader" role="status" aria-label="Buscando…">
            <span className="want-loader-dot" aria-hidden="true" />
            <span className="want-loader-dot" aria-hidden="true" />
            <span className="want-loader-dot" aria-hidden="true" />
          </div>
        )}
        {hasQuery && isSearchError && (
          <p className="want-form-status want-form-status--error" role="alert">
            No se pudo buscar. Intenta de nuevo.
          </p>
        )}
        {hasQuery &&
          !isSearchPending &&
          !isSearchError &&
          searchResults?.length === 0 && (
            <p className="want-form-status">Sin resultados para tu búsqueda.</p>
          )}
        {showSuggestions && (
          <ul className="want-search-list">
            {suggestions?.map((card) => (
              <li key={card.oracleId}>
                <button
                  type="button"
                  className="want-search-item"
                  onClick={() => handlePick(card)}
                  aria-label={card.name}
                >
                  <span className="want-search-item-name">{card.name}</span>
                  {card.typeLine && (
                    <span className="want-search-item-meta">{card.typeLine}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {verifyName.length > 0 && isVerifyError && (
          <p className="want-form-status want-form-status--error" role="alert">
            No se pudo cargar la carta.
          </p>
        )}

        {/* While the selected card resolves, its future spot shimmers in the
            preview's own layout, so nothing jumps when the card lands. */}
        {isVerifying && (
          <div className="want-preview" aria-busy="true" aria-label="Cargando carta">
            <span className="skeleton want-skeleton--card" />
            <div className="want-preview-body">
              <span className="skeleton want-skeleton--name" />
              <span className="skeleton want-skeleton--type" />
              <div className="want-preview-actions">
                <span className="skeleton want-skeleton--actions" />
              </div>
            </div>
          </div>
        )}

        {/* The preview follows the input: emptying the input hides it, and
            both directions run the same enter/exit transition. */}
        <AnimatePresence>
          {hasQuery && !isVerifying && displayCard && (
            <motion.div
              key={displayCard.oracleId}
              className="want-preview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {displayCard.imageNormal ? (
                <WantPreviewCard
                  card={displayCard}
                  onZoom={() => setZoomOpen(true)}
                />
              ) : (
                <div className="want-preview-img want-preview-img--fallback">
                  {displayCard.name}
                </div>
              )}
              <div className="want-preview-body">
                <span className="want-preview-name">{displayCard.name}</span>
                {displayCard.typeLine && (
                  <span className="want-preview-type">
                    {displayCard.typeLine}
                  </span>
                )}
                {displayCard.oracleText && (
                  <p className="want-preview-text">{displayCard.oracleText}</p>
                )}
                <PrintingPicker
                  key={displayCard.oracleId}
                  oracleId={displayCard.oracleId}
                  takenPrintingIds={wantedPrintingIds}
                  selected={preferredPrinting}
                  onSelect={(printing) =>
                    setPrintingChoice({
                      oracleId: displayCard.oracleId,
                      printing,
                    })
                  }
                  onClear={() => setPrintingChoice(null)}
                />
                <div className="want-preview-actions">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    placeholder="Cantidad"
                    aria-label="Cantidad"
                    className="field want-preview-quantity"
                    {...register('quantity')}
                  />
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={addBlocked}
                  >
                    Agregar a Deseos
                  </button>
                </div>
                {errors.quantity?.message && (
                  <span className="field-error" role="alert">
                    {errors.quantity.message}
                  </span>
                )}
                {addBlocked && (
                  <p className="want-form-status">
                    Esta carta ya está en tu lista.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
      <AnimatePresence>
        {zoomOpen && hasQuery && displayCard && (
          <WantCardZoom
            key={displayCard.oracleId}
            card={displayCard}
            onClose={() => setZoomOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
