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

function renderSlot(target: BinderEntry = entry) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <CardSlot entry={target} />
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

describe('CardSlot double-faced flip', () => {
  const doublePrinting: Printing = {
    ...printing,
    name: 'Bala Ged Recovery // Bala Ged Sanctuary',
    imageNormalBack: 'http://example.com/back.png',
  }

  it('renders a flip face with the back image for a double-faced card', () => {
    mockUsePrinting.mockReturnValue({ data: doublePrinting, isPending: false, isError: false })
    renderSlot()

    expect(document.querySelector('.card-flip')).toBeInTheDocument()
    const backImg = document.querySelector<HTMLImageElement>('.card-face--back img')
    expect(backImg).not.toBeNull()
    expect(backImg).toHaveAttribute('src', 'http://example.com/back.png')
    // The front is still the normal image.
    const frontImg = document.querySelector<HTMLImageElement>('.card-face--front img.card-image--full')
    expect(frontImg).toHaveAttribute('src', 'http://example.com/n.png')
  })

  it('renders no flip for a single-faced card', () => {
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderSlot()

    expect(document.querySelector('.card-flip')).not.toBeInTheDocument()
    // The normal (non-flip) full image is still rendered directly.
    expect(document.querySelector('img.card-image--full')).toHaveAttribute(
      'src',
      'http://example.com/n.png',
    )
  })

  it('applies the foil to both faces of a double-faced foil card', () => {
    mockUsePrinting.mockReturnValue({ data: doublePrinting, isPending: false, isError: false })
    renderSlot({ ...entry, finish: 'foil' })

    // One band per face: the finish rides along when the card turns.
    expect(document.querySelectorAll('.card-foil')).toHaveLength(2)
  })

  it('keeps a single foil band for a single-faced foil card', () => {
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderSlot({ ...entry, finish: 'foil' })

    expect(document.querySelectorAll('.card-foil')).toHaveLength(1)
  })
})
