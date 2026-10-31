import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WhoHas from '@/features/wants/components/WhoHas'
import { offersPort } from '@/shared/api/offersPort'
import { useTradeProposalStore } from '@/features/trades/state/tradeProposalStore'

vi.mock('@/shared/api/offersPort', () => ({
  offersPort: { offersOf: vi.fn(async () => []) },
}))

const offersOf = offersPort.offersOf as ReturnType<typeof vi.fn>

function renderWhoHas(oracleId = 'o1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <WhoHas oracleId={oracleId} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  offersOf.mockReset()
  offersOf.mockResolvedValue([])
  useTradeProposalStore.getState().closeTradeProposal()
})

describe('WhoHas', () => {
  it('renders nothing while the port returns an empty list', async () => {
    const { container } = renderWhoHas()

    // Wait for the query to settle, then assert nothing was projected.
    await vi.waitFor(() => expect(offersOf).toHaveBeenCalled())
    expect(container.firstChild).toBeNull()
  })

  it('renders a compact stack with the owner count when there are owners', async () => {
    offersOf.mockResolvedValue([
      {
        id: 'u1',
        displayName: 'Ana',
        avatarUrl: 'http://example.com/ana.png',
        offersCopies: 2,
      },
      { id: 'u2', displayName: 'Bruno', offersCopies: 1 },
    ])
    const { container } = renderWhoHas()

    expect(await screen.findByText('2 la tienen')).toBeInTheDocument()
    expect(
      container.querySelector('img[src="http://example.com/ana.png"]'),
    ).toBeInTheDocument()
    expect(container.querySelector('.want-owners-avatar--initial')).toHaveTextContent(
      'B',
    )
  })

  it('uses the singular when a single user holds the card', async () => {
    offersOf.mockResolvedValue([{ id: 'u1', displayName: 'Ana', offersCopies: 1 }])
    renderWhoHas()

    expect(await screen.findByText('1 la tiene')).toBeInTheDocument()
  })

  it('keeps the port order instead of re-sorting in the client', async () => {
    // Deliberately ordered so a client-side sort would reorder them. Ordering
    // is the backend's job, so the rendered order must match the port's order.
    offersOf.mockResolvedValue([
      { id: 'u-first', displayName: 'Zeta', offersCopies: 9 },
      { id: 'u-second', displayName: 'Alfa', offersCopies: 1 },
    ])
    const { container } = renderWhoHas()

    expect(await screen.findByText('2 la tienen')).toBeInTheDocument()
    const names = [...container.querySelectorAll('.want-owners-avatar')].map(
      (a) => a.getAttribute('title'),
    )
    expect(names).toEqual(['Zeta', 'Alfa'])
  })

  it('asks the port for the card identity', async () => {
    renderWhoHas('oracle-xyz')

    await vi.waitFor(() =>
      expect(offersOf).toHaveBeenCalledWith('oracle-xyz', expect.anything()),
    )
  })

  it('opens the proposal panel from an offerer face with the matched card preselected', async () => {
    offersOf.mockResolvedValue([
      { id: 'u1', displayName: 'Ana', offersCopies: 2 },
      { id: 'u2', displayName: 'Bruno', offersCopies: 1 },
    ])
    renderWhoHas('oracle-xyz')

    fireEvent.click(await screen.findByRole('button', { name: 'Ana' }))

    expect(useTradeProposalStore.getState().request).toEqual({
      counterpart: { id: 'u1', displayName: 'Ana' },
      prefillGiveEntryId: null,
      prefillAskOracleId: 'oracle-xyz',
    })
  })

  it('keeps the compact contract: the face buttons carry the name for assistive tech only', async () => {
    offersOf.mockResolvedValue([{ id: 'u1', displayName: 'Ana', offersCopies: 2 }])
    renderWhoHas()

    expect(await screen.findByRole('button', { name: 'Ana' })).toBeInTheDocument()
    // No visible per-user name joins the count: the row stays compact.
    expect(screen.queryByText('Ana')).toBeNull()
  })
})
