/**
 * Both sides of a trade: the physical printings I give (my binder owns
 * printings) and the logical cards I ask for (the counterpart's binder is
 * matched at the oracle level, the data model's oracle/printing split).
 */
export interface TradeSides {
  give: { printingId: string; quantity: number }[]
  ask: { oracleId: string; quantity: number }[]
}

/** What a user sends when proposing a trade, plus who it goes to. */
export interface TradeProposal extends TradeSides {
  counterpartId: string
}

/** Lifecycle of a proposed pair. Stage 4 renders these states; Stage 3 only
 *  ever produces `pending`. */
export type TradeState = 'pending' | 'accepted' | 'declined'

/** A proposal as stored: its identity, both sides and where it stands. */
export interface TradePair extends TradeSides {
  id: string
  counterpartId: string
  state: TradeState
}

/**
 * Honest rejection for trade actions with no backend behind them. Same spirit
 * as `AuthUnavailableError`: the local port refuses rather than fabricating a
 * counterparty or a success the server never saw.
 */
export class TradesUnavailableError extends Error {
  constructor() {
    super('Trade actions require a backend that is not connected yet.')
    this.name = 'TradesUnavailableError'
  }
}

/**
 * Port for trade proposals. `proposeTrade` is consumed by Stage 3's inline
 * panel; `myTradePairs`/`respondTrade` are the Stage 4 "Mis trades" surface,
 * declared now so the contract is one seam instead of two later. A future
 * backend satisfies this contract without touching consumers.
 */
export interface TradesPort {
  proposeTrade(proposal: TradeProposal): Promise<TradePair>
  myTradePairs(signal?: AbortSignal): Promise<TradePair[]>
  respondTrade(pairId: string, action: 'accept' | 'decline'): Promise<TradePair>
}

/**
 * Local implementation: with no backend there is no one to trade with, so
 * every mutation rejects honestly and the list is always empty — it never
 * invents counterparties, pairs or successes.
 */
export const localTradesPort: TradesPort = {
  proposeTrade: async () => {
    throw new TradesUnavailableError()
  },
  myTradePairs: async () => [],
  respondTrade: async () => {
    throw new TradesUnavailableError()
  },
}

/**
 * Dev-only mock holding proposals in memory so the proposal flow can be
 * previewed before the API exists. Gated behind DEV and the same explicit
 * `VITE_MOCK_WISHERS` flag that previews both match sections, so one switch
 * shows the whole trading surface and production always ships the honest
 * local port.
 */
let mockPairs: TradePair[] = []

export const mockTradesPort: TradesPort = {
  proposeTrade: async (proposal) => {
    const pair: TradePair = {
      id: `mock-pair-${mockPairs.length + 1}`,
      state: 'pending',
      ...proposal,
    }
    mockPairs.push(pair)
    return pair
  },
  myTradePairs: async () => [...mockPairs],
  respondTrade: async (pairId, action) => {
    const pair = mockPairs.find((item) => item.id === pairId)
    if (!pair) throw new Error(`Unknown trade pair: ${pairId}`)
    pair.state = action === 'accept' ? 'accepted' : 'declined'
    return pair
  },
}

/**
 * Active trades adapter. Consumers go through this binding only. The mock is
 * gated behind both DEV and an explicit opt-in flag: a production build always
 * resolves to the honest local port regardless of the flag.
 */
export const tradesPort: TradesPort =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_WISHERS === '1'
    ? mockTradesPort
    : localTradesPort
