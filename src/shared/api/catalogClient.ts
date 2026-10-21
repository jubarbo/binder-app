import { apiConfigured } from '@/shared/api/apiClient'
import { apiCatalogPort } from '@/shared/api/apiCatalogPort'
import type { CatalogPort } from '@/shared/api/catalogPort'
import { scryfallClient } from '@/shared/api/scryfallClient'

/**
 * Active catalog adapter. Consumers go through this binding only: binder-api
 * when `VITE_API_URL` is set, the public Scryfall API otherwise.
 */
export const catalogClient: CatalogPort = apiConfigured ? apiCatalogPort : scryfallClient
