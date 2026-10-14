import type { Ref } from 'react'
import { useSearchCards } from '@/features/catalog/catalogQueries'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import type { OracleCard } from '@/shared/types/mtg'

interface CardSearchProps {
  /** Query text, owned by the parent so a flow can read, seed or clear it. */
  query: string
  onQueryChange: (query: string) => void
  /** A suggestion was picked. */
  onSelect: (card: OracleCard) => void
  /** Enter pressed in the input (e.g. verify a fully typed name). */
  onEnter?: () => void
  /** Oracle ids to hide from the suggestions (already picked or previewed). */
  excludeOracleIds?: ReadonlySet<string>
  /** Hide the suggestion list while keeping the input and status messages. */
  hideSuggestions?: boolean
  placeholder?: string
  inputRef?: Ref<HTMLInputElement>
}

/**
 * Shared card search: a debounced oracle-level autocomplete used by both the
 * want form and the add-card dialog. The parent owns the query text; this
 * component owns fetching plus the loading / error / empty states and the
 * suggestion list, so the two flows no longer duplicate the search logic.
 */
export default function CardSearch({
  query,
  onQueryChange,
  onSelect,
  onEnter,
  excludeOracleIds,
  hideSuggestions,
  placeholder = 'Buscar carta...',
  inputRef,
}: CardSearchProps) {
  const debouncedQuery = useDebouncedValue(query)
  const { data: results, isPending, isError } = useSearchCards(debouncedQuery)
  // A disabled (empty-query) TanStack query still reports `isPending`, so the
  // empty-input guard must run before the loading state is considered.
  const hasQuery = query.trim().length > 0
  const suggestions = results?.filter(
    (card) => !excludeOracleIds?.has(card.oracleId),
  )
  const showSuggestions =
    hasQuery && !isPending && !isError && !hideSuggestions &&
    (suggestions?.length ?? 0) > 0

  return (
    <>
      <div className="card-search-row">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onEnter?.()
            }
          }}
          placeholder={placeholder}
          aria-label="Buscar carta"
          className="field"
        />
      </div>

      {hasQuery && isPending && !results && (
        <div className="card-search-loader" role="status" aria-label="Buscando…">
          <span className="card-search-loader-dot" aria-hidden="true" />
          <span className="card-search-loader-dot" aria-hidden="true" />
          <span className="card-search-loader-dot" aria-hidden="true" />
        </div>
      )}
      {hasQuery && isError && (
        <p className="card-search-status card-search-status--error" role="alert">
          No se pudo buscar. Intenta de nuevo.
        </p>
      )}
      {hasQuery && !isPending && !isError && results?.length === 0 && (
        <p className="card-search-status">Sin resultados para tu búsqueda.</p>
      )}
      {showSuggestions && (
        <ul className="card-search-list">
          {suggestions?.map((card) => (
            <li key={card.oracleId}>
              <button
                type="button"
                className="card-search-item"
                onClick={() => onSelect(card)}
                aria-label={card.name}
              >
                <span className="card-search-item-body">
                  <span className="card-search-item-name">{card.name}</span>
                  {card.typeLine && (
                    <span className="card-search-item-meta">{card.typeLine}</span>
                  )}
                </span>
                {card.imageNormal && (
                  <img
                    className="card-search-item-thumb"
                    src={card.imageNormal}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    draggable={false}
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
