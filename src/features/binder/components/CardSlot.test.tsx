import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CardSlot from '@/features/binder/components/CardSlot'
import { useFlightStore } from '@/features/binder/transition/flightStore'
import type { BinderEntry, Printing } from '@/shared/types/mtg'

vi.mock('@/features/catalog/catalogQueries', () => ({
  usePrinting: vi.fn(),
}))

import { usePrinting } from '@/features/catalog/catalogQueries'

const mockUsePrinting = usePrinting as unknown as ReturnType<typeof vi.fn>

const entry: BinderEntry = { id: 'e1', printingId: 'p1', quantity: 1, condition: 'NM', language: 'en', forTrade: true }

const printing: Printing = {
  id: 'p1',
  oracleId: 'o1',
  name: 'Test Card',
  setCode: 'TST',
  setName: 'Test Set',
  collectorNumber: '123',
  rarity: 'common',
  finishes: ['nonfoil'],
  imageSmall: 'http://example.com/s.png',
  imageNormal: 'http://example.com/n.png',
  imageLarge: '',
  prices: undefined,
}

function renderSlot() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <CardSlot entry={entry} />
    </MemoryRouter>,
  )
}

describe('CardSlot', () => {
  beforeEach(() => {
    useFlightStore.setState({ flight: null })
  })

  it('renders loading placeholder when pending', () => {
    mockUsePrinting.mockReturnValue({ data: undefined, isPending: true, isError: false })
    renderSlot()
    expect(screen.getByLabelText(/Cargando carta/i)).toBeInTheDocument()
  })

  it('renders error state when error', () => {
    mockUsePrinting.mockReturnValue({ data: undefined, isPending: false, isError: true })
    renderSlot()
    expect(screen.getByText('?')).toBeInTheDocument()
    expect(screen.getByLabelText('No se pudo cargar la carta')).toBeInTheDocument()
  })

  it('starts a flight on click; the route swap belongs to the overlay', () => {
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderSlot()
    fireEvent.click(screen.getByRole('button'))
    expect(useFlightStore.getState().flight?.entryId).toBe('e1')
  })
})
