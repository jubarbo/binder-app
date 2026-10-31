import { describe, it, expect, beforeEach } from 'vitest'
import { useTradeProposalStore } from '@/features/trades/state/tradeProposalStore'

describe('tradeProposalStore', () => {
  beforeEach(() => {
    useTradeProposalStore.getState().closeTradeProposal()
  })

  it('starts closed', () => {
    expect(useTradeProposalStore.getState().request).toBeNull()
  })

  it('opens with the counterpart and the entry-point prefills', () => {
    useTradeProposalStore.getState().openTradeProposal({
      counterpart: { id: 'u1', displayName: 'Ana' },
      prefillGiveEntryId: 'entry-9',
    })

    expect(useTradeProposalStore.getState().request).toEqual({
      counterpart: { id: 'u1', displayName: 'Ana' },
      prefillGiveEntryId: 'entry-9',
      prefillAskOracleId: null,
    })
  })

  it('normalizes absent prefills to null so one open never carries the previous one', () => {
    useTradeProposalStore.getState().openTradeProposal({
      counterpart: { id: 'u1', displayName: 'Ana' },
      prefillGiveEntryId: 'entry-9',
      prefillAskOracleId: 'orb-1',
    })

    useTradeProposalStore.getState().openTradeProposal({
      counterpart: { id: 'u2', displayName: 'Bruno' },
    })

    expect(useTradeProposalStore.getState().request).toEqual({
      counterpart: { id: 'u2', displayName: 'Bruno' },
      prefillGiveEntryId: null,
      prefillAskOracleId: null,
    })
  })

  it('closes back to a clean state', () => {
    useTradeProposalStore.getState().openTradeProposal({
      counterpart: { id: 'u1', displayName: 'Ana' },
    })

    useTradeProposalStore.getState().closeTradeProposal()

    expect(useTradeProposalStore.getState().request).toBeNull()
  })
})
