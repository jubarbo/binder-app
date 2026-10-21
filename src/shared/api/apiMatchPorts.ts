import { apiRequest } from '@/shared/api/apiClient'
import type { Offerer, OffersPort } from '@/shared/api/offersPort'
import type { Wisher, WishersPort } from '@/shared/api/wishersPort'

const enc = encodeURIComponent

/**
 * Matching adapters backed by binder-api. The API resolves and orders the
 * matches (and leaves the signed-in viewer out); the UI only projects them.
 */
export const apiWishersPort: WishersPort = {
  wishersOf: (oracleId, signal) =>
    apiRequest<Wisher[]>(`/match/wishers/${enc(oracleId)}`, { signal }),
}

export const apiOffersPort: OffersPort = {
  offersOf: (oracleId, signal) =>
    apiRequest<Offerer[]>(`/match/offers/${enc(oracleId)}`, { signal }),
}
