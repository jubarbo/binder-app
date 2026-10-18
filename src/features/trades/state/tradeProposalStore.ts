import { create } from 'zustand'

/**
 * The single open/closed state of the trade proposal panel. Any match
 * surface opens it with the counterpart identity plus the entry-point
 * prefills; the overlay mounted in the app shell is its only consumer.
 */
export interface TradeProposalRequest {
  /** Who receives the proposal: identity only, never an inventory. */
  counterpart: { id: string; displayName: string }
  /** The matched binder entry, pre-selected at the WhoWants entry point. */
  prefillGiveEntryId?: string | null
  /** The matched card, pre-selected at the WhoHas entry point. */
  prefillAskOracleId?: string | null
}

interface TradeProposalState {
  request: TradeProposalRequest | null
  openTradeProposal: (request: TradeProposalRequest) => void
  closeTradeProposal: () => void
}

export const useTradeProposalStore = create<TradeProposalState>((set) => ({
  request: null,
  // Absent prefills normalize to null so opening from one entry point can
  // never carry the previous open's preselection into the columns.
  openTradeProposal: (request) =>
    set({
      request: {
        counterpart: request.counterpart,
        prefillGiveEntryId: request.prefillGiveEntryId ?? null,
        prefillAskOracleId: request.prefillAskOracleId ?? null,
      },
    }),
  closeTradeProposal: () => set({ request: null }),
}))
