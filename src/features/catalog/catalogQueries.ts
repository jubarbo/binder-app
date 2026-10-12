import { useQuery } from '@tanstack/react-query'
import { scryfallClient } from '../../shared/api/scryfallClient'

/** Scoped query-key factory for catalog data. */
export const catalogKeys = {
  all: ['catalog'] as const,
  search: (query: string) => ['catalog', 'search', query] as const,
  named: (name: string) => ['catalog', 'named', name] as const,
  printing: (id: string) => ['catalog', 'printing', id] as const,
  printings: (oracleId: string) => ['catalog', 'printings', oracleId] as const,
}

/** Search the catalog at the oracle level (full-text, Scryfall syntax). */
export function useSearchCards(query: string) {
  const normalizedQuery = query.trim()
  return useQuery({
    queryKey: catalogKeys.search(normalizedQuery),
    queryFn: ({ signal }) => scryfallClient.fetchSearch(normalizedQuery, signal),
    enabled: normalizedQuery.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

/** Fetch one physical printing by its printing id. */
export function usePrinting(id: string) {
  const normalizedId = id.trim()
  return useQuery({
    queryKey: catalogKeys.printing(normalizedId),
    queryFn: ({ signal }) => scryfallClient.fetchPrinting(normalizedId, signal),
    enabled: normalizedId.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

/** Fetch printings for an oracle id. */
export function usePrintings(oracleId: string) {
  const normalizedId = oracleId.trim()
  return useQuery({
    queryKey: catalogKeys.printings(normalizedId),
    queryFn: ({ signal }) => scryfallClient.fetchPrintings(normalizedId, signal),
    enabled: normalizedId.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
