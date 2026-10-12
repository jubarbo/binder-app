import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { scryfallClient } from '../../../shared/api/scryfallClient'
import type { BinderEntry } from '../../../shared/types/mtg'
import { catalogKeys } from '../../catalog/catalogQueries'
import { useBinderStore } from '../state/binderStore'
import CardSlot from './CardSlot'
import AddCard from './AddCard'

/** Pockets per binder page: a 3x3 trading-card page. */
const SLOTS_PER_PAGE = 9

interface SampleCard {
  name: string
  /** Fixed quantity so the seeded binder stays deterministic. */
  quantity: number
}

/**
 * Temporary sample set for T2 so the layout can be exercised before the real
 * add-card search flow (T4) exists. Quantities are fixed; no randomness.
 */
const SAMPLE_CARDS: readonly SampleCard[] = [
  { name: 'Lightning Bolt', quantity: 3 },
  { name: 'Sol Ring', quantity: 2 },
  { name: 'Black Lotus', quantity: 1 },
  { name: 'Counterspell', quantity: 3 },
  { name: 'Dark Ritual', quantity: 2 },
  { name: 'Birds of Paradise', quantity: 1 },
  { name: 'Giant Growth', quantity: 2 },
  { name: 'Wrath of God', quantity: 1 },
  { name: 'Elvish Mystic', quantity: 3 },
]

/**
 * Resolve a printing id for a card name. A named (fuzzy) lookup is used rather
 * than a free-text search: Scryfall's search sorts matches by name, so a plain
 * name like "Sol Ring" returns an unrelated card first. The named lookup yields
 * the oracle-level card exactly, whose first printing id is then fetched.
 */
async function resolveSamplePrintingId(client: QueryClient, name: string): Promise<string | null> {
  const card = await client.fetchQuery({
    queryKey: catalogKeys.named(name),
    queryFn: ({ signal }) => scryfallClient.fetchNamed(name, signal),
  })
  if (!card.oracleId) return null

  const printings = await client.fetchQuery({
    queryKey: catalogKeys.printings(card.oracleId),
    queryFn: ({ signal }) => scryfallClient.fetchPrintings(card.oracleId, signal),
  })
  return printings[0]?.id ?? null
}

/**
 * Temporary dev loader (T4 replaces it with real search). Resolves each sample
 * name to a printing id, skips empty or unresolvable results, dedupes against
 * the live store, and adds deterministic entries.
 */
async function loadSampleCards(client: QueryClient): Promise<void> {
  for (const sample of SAMPLE_CARDS) {
    let printingId: string | null = null
    try {
      printingId = await resolveSamplePrintingId(client, sample.name)
    } catch {
      // No matches / transport failure: skip this name silently.
      printingId = null
    }
    if (!printingId) continue

    // Read the live store each pass so concurrent loads cannot double-add.
    const state = useBinderStore.getState()
    if (state.entries.some((entry) => entry.printingId === printingId)) continue

    const newEntry: BinderEntry = {
      id: crypto.randomUUID(),
      printingId,
      quantity: sample.quantity,
      condition: 'NM',
      language: 'en',
      forTrade: true,
    }
    state.addEntry(newEntry)
  }
}

/**
 * Binder page (T2): renders the persisted entries as a pocket-page grid with
 * prev/next navigation. Empty slots keep the 3x3 page shape.
 */
export default function BinderPage() {
  const entries = useBinderStore((state) => state.entries)
  const client = useQueryClient()
  const [pageIndex, setPageIndex] = useState(0)
  const [isLoadingSamples, setIsLoadingSamples] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const pageCount = Math.max(1, Math.ceil(entries.length / SLOTS_PER_PAGE))
  const currentPage = Math.min(pageIndex, pageCount - 1)
  const pageStart = currentPage * SLOTS_PER_PAGE
  const pageEntries = entries.slice(pageStart, pageStart + SLOTS_PER_PAGE)
  const emptySlotCount = SLOTS_PER_PAGE - pageEntries.length

  const handleLoadSamples = async () => {
    setIsLoadingSamples(true)
    try {
      await loadSampleCards(client)
    } finally {
      setIsLoadingSamples(false)
    }
  }

  if (entries.length === 0) {
    return (
      <section className="page binder-page">
        <h1>Binder</h1>
        <div className="binder-empty">
          <p>Your binder is empty. Add cards to start filling the pages.</p>
          <div className="binder-dev-action">
            <button type="button" onClick={() => setShowAdd(true)}>Agregar carta</button>
            <button type="button" onClick={handleLoadSamples} disabled={isLoadingSamples}>
              {isLoadingSamples ? 'Loading sample cards...' : 'Load sample cards'}
            </button>
            <p className="binder-dev-note">
              Temporary dev action; real card search arrives in a later task.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page binder-page">
      <header className="binder-header">
        <h1>Binder</h1>
        {pageCount > 1 && (
          <div className="binder-nav">
            <button
              type="button"
              className="binder-nav-button"
              onClick={() => setPageIndex(currentPage - 1)}
              disabled={currentPage <= 0}
              aria-label="Previous page"
            >
              Prev
            </button>
            <span className="binder-page-indicator" aria-live="polite">
              Page {currentPage + 1} of {pageCount}
            </span>
            <button
              type="button"
              className="binder-nav-button"
              onClick={() => setPageIndex(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        )}
      </header>
      <div className="binder-page-frame">
        <ul className="binder-grid" aria-label={`Binder page ${currentPage + 1} of ${pageCount}`}>
          {pageEntries.map((entry) => (
            <li key={entry.id} className="binder-slot">
              <CardSlot entry={entry} />
            </li>
          ))}
          {Array.from({ length: emptySlotCount }, (_, index) => (
            <li key={`empty-${index}`} className="binder-slot binder-slot--empty" aria-hidden="true">
              <span className="binder-empty-pocket" />
            </li>
          ))}
        </ul>
      </div>
      {showAdd && <AddCard onClose={() => setShowAdd(false)} />}
    </section>
  )
}
