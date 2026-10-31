import { AnimatePresence } from 'motion/react'
import TradeProposalPanel from '@/features/trades/components/TradeProposalPanel'
import { useTradeProposalStore } from '@/features/trades/state/tradeProposalStore'

/**
 * The app-wide host of the trade proposal panel: the match surfaces open it
 * through the store, and this single mount owns the panel's presence and its
 * exit animation (`AnimatePresence` stays with the caller, per the panel's
 * dialog mold).
 */
export default function TradeProposalOverlay() {
  const request = useTradeProposalStore((state) => state.request)
  const closeTradeProposal = useTradeProposalStore((state) => state.closeTradeProposal)

  return (
    <AnimatePresence>
      {request && (
        <TradeProposalPanel
          counterpart={request.counterpart}
          prefillGiveEntryId={request.prefillGiveEntryId}
          prefillAskOracleId={request.prefillAskOracleId}
          onClose={closeTradeProposal}
        />
      )}
    </AnimatePresence>
  )
}
