import { apiRequest } from '@/shared/api/apiClient'
import type { CatalogPort } from '@/shared/api/catalogPort'
import type { OffersPort, Offerer } from '@/shared/api/offersPort'
import type { Wisher, WishersPort } from '@/shared/api/wishersPort'
import { getActiveLocale } from '@/shared/locale/localeStore'
import type { OracleCard, Printing } from '@/shared/types/mtg'

const SEARCH_LIMIT = 50

/**
 * binder-api catalog adapter. The API mirrors `OracleCard` / `Printing`
 * (optional fields omitted, never null), so responses need no mapping. The
 * search already merges English and the active locale server-side.
 */
export const apiCatalogPort: CatalogPort = {
  async fetchSearch(query, signal) {
    const q = query.trim()
    if (!q) return []
    const params = new URLSearchParams({ q, locale: getActiveLocale(), limit: String(SEARCH_LIMIT) })
    return apiRequest<OracleCard[]>(`/catalog/search?${params}`, { signal })
  },

  fetchNamed(name, signal) {
    const params = new URLSearchParams({ locale: getActiveLocale() })
    return apiRequest<OracleCard>(`/catalog/cards/${encodeURIComponent(name.trim())}?${params}`, { signal })
  },

  fetchPrinting(id, signal) {
    return apiRequest<Printing>(`/catalog/printings/${encodeURIComponent(id)}`, { signal })
  },

  fetchPrintings(oracleId, signal) {
    return apiRequest<Printing[]>(`/catalog/oracles/${encodeURIComponent(oracleId)}/printings`, { signal })
  },
}

/** "Who wants this card": matched and ordered by the API; the signed-in viewer is excluded. */
export const apiWishersPort: WishersPort = {
  wishersOf: (oracleId, signal) =>
    apiRequest<Wisher[]>(`/match/wishers/${encodeURIComponent(oracleId)}`, { signal }),
}

/** "Who has this card for trade": copies summed per user by the API. */
export const apiOffersPort: OffersPort = {
  offersOf: (oracleId, signal) =>
    apiRequest<Offerer[]>(`/match/offers/${encodeURIComponent(oracleId)}`, { signal }),
}
