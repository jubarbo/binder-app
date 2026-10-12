import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useSearchCards, usePrintings } from '../../catalog/catalogQueries'
import type { OracleCard, Printing } from '../../../shared/types/mtg'
import { useBinderStore } from '../state/binderStore'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'

interface AddCardProps {
  onClose?: () => void
}

export default function AddCard({ onClose }: AddCardProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const [selectedCard, setSelectedCard] = useState<OracleCard | null>(null)
  const [selectedPrinting, setSelectedPrinting] = useState<Printing | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  
  const { data: searchResults } = useSearchCards(debouncedQuery)
  const { data: printings } = usePrintings(selectedCard?.oracleId || '')
  const addEntry = useBinderStore((s) => s.addEntry)
  
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
      >
        <h2>Agregar carta</h2>
        {!selectedCard ? (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar carta..."
              className="add-card-input"
            />
            <div className="add-card-results">
              {searchResults?.map((card) => (
                <button
                  key={card.oracleId}
                  onClick={() => handleSelectCard(card)}
                  className="add-card-result-item"
                >
                  {card.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h3>{selectedCard.name}</h3>
            <select
              value={selectedPrinting?.id || ''}
              onChange={(e) => {
                const p = printings?.find((pr) => pr.id === e.target.value)
                setSelectedPrinting(p || null)
              }}
              className="add-card-input"
            >
              <option value="">Seleccionar impresión</option>
              {printings?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.setName} #{p.collectorNumber}
                </option>
              ))}
            </select>
            <div className="add-card-actions">
              <button onClick={() => setSelectedCard(null)}>Atrás</button>
              <button
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
