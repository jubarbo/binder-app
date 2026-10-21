import type { OracleCard, Printing } from '@/shared/types/mtg'
import { ApiError, apiRequest } from '@/shared/api/apiClient'
import { CatalogError, type CatalogPort } from '@/shared/api/catalogPort'
import { getActiveLocale } from '@/shared/locale/localeStore'

/** Re-throw API failures as CatalogError, the error type catalog consumers know. */
async function catalogCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    if (error instanceof ApiError) {
      throw new CatalogError(error.message, {
        status: error.status || undefined,
        code: error.code,
      })
    }
    throw error
  }
}

const enc = encodeURIComponent

/**
 * `CatalogPort` backed by binder-api's local Scryfall mirror. Search is the
 * API's Strategy A (names in every supported locale, accent-insensitive,
 * one result per oracle id), displayed in the active locale with an English
 * fallback — the same contract the Scryfall adapter honours client-side.
 */
export const apiCatalogPort: CatalogPort = {
  async fetchSearch(query, signal) {
    const trimmed = query.trim()
    if (!trimmed) return []
    const params = new URLSearchParams({ q: trimmed, locale: getActiveLocale() })
    return catalogCall(() =>
      apiRequest<OracleCard[]>(`/catalog/search?${params.toString()}`, { signal }),
    )
  },

  async fetchNamed(name, signal) {
    const trimmed = name.trim()
    if (!trimmed) throw new CatalogError('A card name is required.')
    const params = new URLSearchParams({ locale: getActiveLocale() })
    return catalogCall(() =>
      apiRequest<OracleCard>(`/catalog/cards/${enc(trimmed)}?${params.toString()}`, { signal }),
    )
  },

  async fetchPrinting(id, signal) {
    const trimmed = id.trim()
    if (!trimmed) throw new CatalogError('A printing id is required.')
    return catalogCall(() => apiRequest<Printing>(`/catalog/printings/${enc(trimmed)}`, { signal }))
  },

  async fetchPrintings(oracleId, signal) {
    const trimmed = oracleId.trim()
    if (!trimmed) return []
    return catalogCall(() =>
      apiRequest<Printing[]>(`/catalog/oracles/${enc(trimmed)}/printings`, { signal }),
    )
  },
}
