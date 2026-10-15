import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WhoWants from '@/features/binder/components/WhoWants'
import { wishersPort } from '@/shared/api/wishersPort'

vi.mock('@/shared/api/wishersPort', () => ({
  wishersPort: { wishersOf: vi.fn(async () => []) },
}))

const wishersOf = wishersPort.wishersOf as ReturnType<typeof vi.fn>

function renderWhoWants(oracleId = 'o1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <WhoWants oracleId={oracleId} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  wishersOf.mockReset()
  wishersOf.mockResolvedValue([])
})

describe('WhoWants', () => {
  it('reports nobody while the port returns an empty list', async () => {
    renderWhoWants()

    expect(
      await screen.findByText('Nadie la desea todavía.'),
    ).toBeInTheDocument()
  })

  it('lists a card per wisher with an avatar falling back to an initial', async () => {
    wishersOf.mockResolvedValue([
      {
        id: 'u1',
        displayName: 'Ana',
        avatarUrl: 'http://example.com/ana.png',
        wantsCopies: 2,
      },
      { id: 'u2', displayName: 'Bruno', wantsCopies: 1 },
    ])
    const { container } = renderWhoWants()

    // The photo is decorative now: the visible name carries the meaning.
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(
      container.querySelector('img[src="http://example.com/ana.png"]'),
    ).toBeInTheDocument()
    expect(screen.getByText('Bruno')).toBeInTheDocument()
    expect(container.querySelector('.wanters-avatar--initial')).toHaveTextContent(
      'B',
    )
  })

  it('shows a quantity badge with the number of copies each wants', async () => {
    wishersOf.mockResolvedValue([
      { id: 'u1', displayName: 'Ana', wantsCopies: 3 },
      { id: 'u2', displayName: 'Bruno', wantsCopies: 1 },
    ])
    renderWhoWants()

    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.getByLabelText('3 copias')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByLabelText('1 copia')).toBeInTheDocument()
  })

  it('does not render a priority label', async () => {
    wishersOf.mockResolvedValue([
      { id: 'u1', displayName: 'Ana', wantsCopies: 3 },
    ])
    const { container } = renderWhoWants()

    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(container.querySelector('.wanters-priority')).toBeNull()
    expect(screen.queryByText('Alta')).toBeNull()
    expect(screen.queryByText('Baja')).toBeNull()
    expect(screen.queryByText('Normal')).toBeNull()
  })

  it('keeps the port order instead of re-sorting in the client', async () => {
    // Deliberately ordered so a client-side sort would reorder them. Ordering
    // is the backend's job, so the rendered order must match the port's order.
    wishersOf.mockResolvedValue([
      { id: 'u-first', displayName: 'Zeta', wantsCopies: 9 },
      { id: 'u-second', displayName: 'Alta', wantsCopies: 1 },
    ])
    const { container } = renderWhoWants()

    expect(await screen.findByText('Zeta')).toBeInTheDocument()
    const names = [...container.querySelectorAll('.wanters-name')].map(
      (n) => n.textContent,
    )
    expect(names).toEqual(['Zeta', 'Alta'])
  })

  it('asks the port for the card identity', async () => {
    renderWhoWants('oracle-xyz')

    await screen.findByText('Nadie la desea todavía.')
    expect(wishersOf).toHaveBeenCalledWith('oracle-xyz', expect.anything())
  })
})
