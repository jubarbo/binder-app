import { apiCatalogPort } from '@/shared/api/apiCatalogPort'
import { apiConfigured } from '@/shared/api/apiClient'
import type { CatalogPort } from '@/shared/api/catalogPort'
import { scryfallClient } from '@/shared/api/scryfallClient'

/**
 * Active catalog adapter. Consumers go through this binding only: a build
 * configured with VITE_API_URL reads binder-api's catalog mirror, one without
 * it keeps calling Scryfall directly.
 */
export const catalogPort: CatalogPort = apiConfigured ? apiCatalogPort : scryfallClient
