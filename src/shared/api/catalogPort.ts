import type { OracleCard, Printing } from '@/shared/types/mtg'

/**
 * Error thrown by catalog adapters. Carries a human-readable message plus the
 * optional HTTP status and Scryfall error code, so consumers can distinguish
 * "not found" from a transport or rate-limit failure without depending on a
 * specific adapter implementation.
 */
export class CatalogError extends Error {
  readonly status?: number
  readonly code?: string

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message)
    this.name = 'CatalogError'
    this.status = options?.status
    this.code = options?.code
  }
}

/**
 * Port for the card catalog. The live implementation talks to Scryfall; a
 * future backend can satisfy the same contract without touching consumers.
 */
export interface CatalogPort {
  /** Oracle-level full-text search (Scryfall query syntax supported). */
  fetchSearch(query: string, signal?: AbortSignal): Promise<OracleCard[]>
  /** Best-effort fuzzy lookup of a single logical card by name. */
  fetchNamed(name: string, signal?: AbortSignal): Promise<OracleCard>
  /** Fetch one physical printing by its printing id. */
  fetchPrinting(id: string, signal?: AbortSignal): Promise<Printing>
  /** Fetch every known printing for a logical card. */
  fetchPrintings(oracleId: string, signal?: AbortSignal): Promise<Printing[]>
}
