import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TradeProposalOverlay from '@/features/trades/components/TradeProposalOverlay'
import { useTradeProposalStore } from '@/features/trades/state/tradeProposalStore'

describe('TradeProposalOverlay', () => {
  beforeEach(() => {
    useTradeProposalStore.getState().closeTradeProposal()
  })

  it('renders nothing while no proposal is open', () => {
    const { container } = render(<TradeProposalOverlay />)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(container.firstChild).toBeNull()
  })

  it('opens the panel carrying the stored counterpart and prefills', () => {
    useTradeProposalStore.getState().openTradeProposal({
      counterpart: { id: 'u1', displayName: 'Ana' },
      prefillGiveEntryId: 'entry-9',
      prefillAskOracleId: 'orb-1',
    })

    render(<TradeProposalOverlay />)

    expect(screen.getByRole('dialog')).toHaveTextContent('Proponer trade a Ana')
  })

  it('closes through the panel action and clears the store', async () => {
    useTradeProposalStore.getState().openTradeProposal({
      counterpart: { id: 'u1', displayName: 'Ana' },
    })
    render(<TradeProposalOverlay />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(useTradeProposalStore.getState().request).toBeNull()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
