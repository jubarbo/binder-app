import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom'
import CardSlot from '@/features/binder/components/CardSlot'
import type { BinderEntry, Printing } from '@/shared/types/mtg'

vi.mock('@/features/catalog/catalogQueries', () => ({
  usePrinting: vi.fn(),
}))

import { usePrinting } from '@/features/catalog/catalogQueries'

const mockUsePrinting = usePrinting as any

const entry: BinderEntry = { id: 'e1', printingId: 'p1', quantity: 1, condition: 'NM', language: 'en', forTrade: true }

const printing: Printing = {
  id: 'p1',
  oracleId: 'o1',
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

/** Probe route that echoes the matched entryId so navigation is observable. */
function DetailProbe() {
  const { entryId } = useParams()
  return <div>{`detail-${entryId}`}</div>
}

function renderSlot() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<CardSlot entry={entry} />} />
        <Route path="/card/:entryId" element={<DetailProbe />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CardSlot', () => {
  it('renders loading placeholder when pending', () => {
    mockUsePrinting.mockReturnValue({ data: undefined, isPending: true, isError: false })
    renderSlot()
    expect(screen.getByLabelText(/Loading card/i)).toBeInTheDocument()
  })

  it('renders error state when error', () => {
    mockUsePrinting.mockReturnValue({ data: undefined, isPending: false, isError: true })
    renderSlot()
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('navigates to the card detail route when a resolved card is clicked', () => {
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderSlot()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('detail-e1')).toBeInTheDocument()
  })
})
