import { useEffect, useId, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useSearchCards, usePrintings } from '@/features/catalog/catalogQueries'
import type { Finish, OracleCard, Printing } from '@/shared/types/mtg'
import { useBinderStore } from '@/features/binder/state/binderStore'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'

interface AddCardProps {
  onClose?: () => void
}

/** Maximum number of printing options rendered before the list is truncated. */
const MAX_PRINTING_OPTIONS = 25

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

export default function AddCard({ onClose }: AddCardProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const [selectedCard, setSelectedCard] = useState<OracleCard | null>(null)
  const [selectedPrinting, setSelectedPrinting] = useState<Printing | null>(null)
  const [selectedFinish, setSelectedFinish] = useState<Finish | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const titleId = useId()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Move focus into the dialog on mount and restore it to the trigger on unmount.
  // A full Tab focus-trap is intentionally out of scope; tracked as a follow-up.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    searchInputRef.current?.focus()
    return () => {
      previouslyFocused?.focus?.()
    }
  }, [])

  const {
    data: searchResults,
    isPending: isSearchPending,
    isError: isSearchError,
  } = useSearchCards(debouncedQuery)
  const { data: printings } = usePrintings(selectedCard?.oracleId || '')
  const addEntry = useBinderStore((s) => s.addEntry)

  // A disabled (empty-query) TanStack query still reports `isPending`, so the
  // empty-input guard must run before the loading state is considered.
  const hasQuery = query.trim().length > 0

  const sortedPrintings = [...(printings ?? [])].sort((a, b) => {
    const bySet = a.setName.localeCompare(b.setName, 'es')
    if (bySet !== 0) return bySet
    return a.collectorNumber.localeCompare(b.collectorNumber, 'es', { numeric: true })
  })
  const visiblePrintings = sortedPrintings.slice(0, MAX_PRINTING_OPTIONS)
  const isPrintingsTruncated = sortedPrintings.length > MAX_PRINTING_OPTIONS

  const renderSearchResults = () => {
    if (!hasQuery) return null
    if (isSearchError) {
      return (
        <p className="add-card-status add-card-status--error" role="alert">
          No se pudo buscar. Intenta de nuevo.
        </p>
      )
    }
    if (isSearchPending && !searchResults) {
      return (
        <p className="add-card-status" aria-live="polite">
          Buscando…
        </p>
      )
    }
    if (searchResults && searchResults.length === 0) {
      return <p className="add-card-status">Sin resultados para tu búsqueda.</p>
    }
    return searchResults?.map((card) => (
      <button
        key={card.oracleId}
        onClick={() => handleSelectCard(card)}
        className="add-card-result-item"
        aria-label={card.name}
      >
        <span className="add-card-result-name">{card.name}</span>
        {card.typeLine && <span className="add-card-result-meta">{card.typeLine}</span>}
      </button>
    ))
  }
  
  const handleSelectCard = (card: OracleCard) => {
    setSelectedCard(card)
    setSelectedPrinting(null)
  }
  
  const handleAdd = () => {
    if (!selectedPrinting) return
    setIsAdding(true)
    addEntry({
      id: crypto.randomUUID(),
      printingId: selectedPrinting.id,
      finish: selectedFinish ?? undefined,
      quantity: 1,
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
          <>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar carta..."
              className="field"
            />
            <div className="add-card-results">{renderSearchResults()}</div>
          </>
        ) : (
          <>
            <h3>{selectedCard.name}</h3>
            <select
              aria-label="Impresión"
              value={selectedPrinting?.id || ''}
              onChange={(e) => {
                const p = printings?.find((pr) => pr.id === e.target.value) ?? null
                setSelectedPrinting(p)
                // Default to the printing's first modelled finish; printings
                // with no modelled finish stay undeclared.
                setSelectedFinish(p ? (knownFinishesOf(p)[0] ?? null) : null)
              }}
              className="field"
            >
              <option value="">Seleccionar impresión</option>
              {isPrintingsTruncated && (
                <option value="" disabled>
                  Mostrando {MAX_PRINTING_OPTIONS} de {sortedPrintings.length} ediciones
                </option>
              )}
              {visiblePrintings.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.setName} #{p.collectorNumber}
                </option>
              ))}
            </select>
            {selectedPrinting &&
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
              )}
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
