import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { usePrintings } from '@/features/catalog/catalogQueries'
import type { Finish, OracleCard, Printing } from '@/shared/types/mtg'
import { useBinderStore } from '@/features/binder/state/binderStore'
import CardSearch from '@/shared/components/CardSearch'
import CardFlip from '@/shared/components/CardFlip'
import ImageSelect from '@/shared/components/ImageSelect'
import { useScrollLock } from '@/shared/hooks/useScrollLock'

interface AddCardProps {
  onClose?: () => void
}

const FINISH_LABELS: Record<Finish, string> = {
  nonfoil: 'Nonfoil',
  foil: 'Foil',
  etched: 'Etched',
}
const KNOWN_FINISHES = Object.keys(FINISH_LABELS) as Finish[]

/** The finishes of a printing the app can model (Scryfall also reports e.g. `digital`). */
const knownFinishesOf = (printing: Printing): Finish[] =>
  printing.finishes.filter((f): f is Finish =>
    (KNOWN_FINISHES as string[]).includes(f),
  )

/**
 * True when the printing offers exactly nonfoil and foil: the only set the
 * checkbox can express honestly. Etched stays on the select.
 */
const isFoilToggle = (printing: Printing) => {
  const finishes = knownFinishesOf(printing)
  return (
    finishes.length === 2 &&
    finishes.includes('nonfoil') &&
    finishes.includes('foil')
  )
}

export default function AddCard({ onClose }: AddCardProps) {
  const [query, setQuery] = useState('')
  const [selectedCard, setSelectedCard] = useState<OracleCard | null>(null)
  const [selectedEdition, setSelectedEdition] = useState<string | null>(null)
  const [selectedPrinting, setSelectedPrinting] = useState<Printing | null>(null)
  const [selectedFinish, setSelectedFinish] = useState<Finish | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const titleId = useId()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // The dialog owns the page: the binder behind it must not scroll.
  useScrollLock(true)

  // Move focus into the dialog on mount and restore it to the trigger on unmount.
  // A full Tab focus-trap is intentionally out of scope; tracked as a follow-up.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    searchInputRef.current?.focus()
    return () => {
      previouslyFocused?.focus?.()
    }
  }, [])

  const { data: printings } = usePrintings(selectedCard?.oracleId || '')
  const addEntry = useBinderStore((s) => s.addEntry)

  // Memoized on the query data so the list keeps a stable identity: the
  // default selection below keys off its first element, and a fresh object
  // per render would re-run it.
  const sortedPrintings = useMemo(
    () =>
      [...(printings ?? [])].sort((a, b) => {
        const bySet = a.setName.localeCompare(b.setName, 'es')
        if (bySet !== 0) return bySet
        return a.collectorNumber.localeCompare(b.collectorNumber, 'es', { numeric: true })
      }),
    [printings],
  )

  // The picker runs in two steps so no dropdown ever gets long, however many
  // printings a card has: pick the edition, then the collector number inside
  // it. Editions are the unique set names of the already-sorted printings, so
  // both lists stay short by construction.
  const editions = useMemo(
    () => [...new Set(sortedPrintings.map((p) => p.setName))],
    [sortedPrintings],
  )
  const editionPrintings = useMemo(
    () =>
      selectedEdition === null
        ? []
        : sortedPrintings.filter((p) => p.setName === selectedEdition),
    [sortedPrintings, selectedEdition],
  )

  // The picker rows carry the art that tells printings apart — a native
  // <select> cannot show images — so every option takes a thumbnail: the
  // edition is represented by its first printing, the number by itself.
  const editionOptions = useMemo(
    () =>
      editions.map((name) => {
        const representative = sortedPrintings.find((p) => p.setName === name)
        return {
          id: name,
          label: name,
          imageSrc: representative?.imageSmall || undefined,
        }
      }),
    [editions, sortedPrintings],
  )
  const numberOptions = useMemo(
    () =>
      editionPrintings.map((p) => ({
        id: p.id,
        label: `#${p.collectorNumber}`,
        imageSrc: p.imageSmall || undefined,
      })),
    [editionPrintings],
  )

  // The catalog answers asynchronously, so the default selection is derived
  // while rendering: the moment the lists land with nothing chosen, the first
  // edition and its first printing — carrying its first known finish, the same
  // rule the manual onChange applies — become the selection and the modal
  // opens ready to add. Changing the edition re-arms the printing the same way.
  // React discards this render and re-renders with the new state (the
  // documented "adjust state during render" pattern), and a printing inside the
  // current edition always wins over the default.
  const firstEdition = editions[0]
  if (firstEdition && selectedEdition === null) {
    setSelectedEdition(firstEdition)
  }
  const firstPrinting = editionPrintings[0]
  if (firstPrinting && selectedPrinting?.setName !== selectedEdition) {
    setSelectedPrinting(firstPrinting)
    setSelectedFinish(knownFinishesOf(firstPrinting)[0] ?? null)
    // A fresh printing starts at a quantity of one.
    setQuantity(1)
  }

  const handleSelectCard = (card: OracleCard) => {
    setSelectedCard(card)
    setSelectedEdition(null)
    setSelectedPrinting(null)
  }

  const handleSelectPrinting = (id: string) => {
    const p = editionPrintings.find((pr) => pr.id === id) ?? null
    setSelectedPrinting(p)
    // Default to the printing's first modelled finish; printings
    // with no modelled finish stay undeclared.
    setSelectedFinish(p ? (knownFinishesOf(p)[0] ?? null) : null)
    // A fresh printing starts at a quantity of one.
    setQuantity(1)
  }
  
  const handleAdd = () => {
    if (!selectedPrinting) return
    setIsAdding(true)
    addEntry({
      id: crypto.randomUUID(),
      printingId: selectedPrinting.id,
      finish: selectedFinish ?? undefined,
      quantity: Math.min(99, Math.max(1, Math.round(quantity) || 1)),
      condition: 'NM',
      language: 'en',
      forTrade: true,
    })
    setTimeout(() => {
      setIsAdding(false)
      onClose?.()
    }, prefersReducedMotion ? 0 : 300)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="add-card-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="add-card-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose?.()
        }}
      >
        <h2 id={titleId}>Agregar carta</h2>
        {!selectedCard ? (
          <CardSearch
            query={query}
            onQueryChange={setQuery}
            onSelect={handleSelectCard}
            inputRef={searchInputRef}
          />
        ) : (
          <>
            <h3>{selectedCard.name}</h3>
            <ImageSelect
              label="Edición"
              placeholder="Seleccionar edición"
              value={selectedEdition}
              options={editionOptions}
              onChange={(id) => setSelectedEdition(id)}
            />
            <ImageSelect
              label="Número de coleccionista"
              placeholder="Seleccionar número"
              value={selectedPrinting?.id ?? null}
              options={numberOptions}
              onChange={handleSelectPrinting}
            />
            {selectedPrinting && (
              <span className="add-card-preview-frame">
                <CardFlip
                  back={
                    selectedPrinting.imageLargeBack ||
                    selectedPrinting.imageNormalBack ? (
                      <img
                        className="add-card-preview"
                        src={
                          selectedPrinting.imageLargeBack ||
                          selectedPrinting.imageNormalBack
                        }
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                      />
                    ) : undefined
                  }
                >
                  <img
                    className="add-card-preview"
                    src={
                      selectedPrinting.imageLarge ||
                      selectedPrinting.imageNormal ||
                      selectedPrinting.imageSmall
                    }
                    alt={`${selectedPrinting.setName} #${selectedPrinting.collectorNumber}`}
                    draggable={false}
                  />
                </CardFlip>
              </span>
            )}
            {selectedPrinting && isFoilToggle(selectedPrinting) ? (
              <label className="add-card-finish-toggle">
                <input
                  type="checkbox"
                  checked={selectedFinish === 'foil'}
                  onChange={(e) =>
                    setSelectedFinish(e.target.checked ? 'foil' : 'nonfoil')
                  }
                />
                Foil
              </label>
            ) : (
              selectedPrinting &&
              knownFinishesOf(selectedPrinting).length > 1 && (
                <select
                  aria-label="Acabado"
                  value={selectedFinish ?? ''}
                  onChange={(e) => setSelectedFinish(e.target.value as Finish)}
                  className="field"
                >
                  {knownFinishesOf(selectedPrinting).map((f) => (
                    <option key={f} value={f}>
                      {FINISH_LABELS[f]}
                    </option>
                  ))}
                </select>
              )
            )}
            <input
              type="number"
              aria-label="Cantidad"
              min={1}
              max={99}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="field add-card-quantity"
            />
            <div className="add-card-actions">
              <button className="btn btn--ghost" onClick={() => setSelectedCard(null)}>Atrás</button>
              <button
                className="btn btn--primary"
                onClick={handleAdd}
                disabled={!selectedPrinting || isAdding}
              >
                {isAdding ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
