import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import CardDetailPage from '@/features/binder/components/CardDetailPage'
import type { BinderEntry, Printing } from '@/shared/types/mtg'

vi.mock('@/features/catalog/catalogQueries', () => ({
  usePrinting: vi.fn(),
}))

const { stateMock } = vi.hoisted(() => ({
  stateMock: { entries: [] as BinderEntry[] },
}))

// Selector-applying store fake, matching the repo convention.
vi.mock('@/features/binder/state/binderStore', () => ({
  useBinderStore: (selector: (state: { entries: BinderEntry[] }) => unknown) =>
    selector(stateMock),
}))

import { usePrinting } from '@/features/catalog/catalogQueries'

const mockUsePrinting = usePrinting as any

const entry: BinderEntry = {
  id: 'e1',
  printingId: 'p1',
  quantity: 2,
  condition: 'NM',
  language: 'en',
  forTrade: true,
}

const printing: Printing = {
  id: 'p1',
  oracleId: 'o1',
  setCode: 'TST',
  setName: 'Test Set',
  collectorNumber: '123',
  rarity: 'rare',
  finishes: ['nonfoil'],
  imageSmall: 'http://example.com/s.png',
  imageNormal: 'http://example.com/n.png',
  imageLarge: 'http://example.com/l.png',
  prices: { usd: '1.50' },
}

function renderPage(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/card/${id}`]}>
      <Routes>
        <Route path="/card/:entryId" element={<CardDetailPage />} />
        <Route path="/" element={<div>binder-home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CardDetailPage', () => {
  beforeEach(() => {
    stateMock.entries = []
    mockUsePrinting.mockReset()
    mockUsePrinting.mockReturnValue({ data: undefined, isPending: false, isError: false })
  })

  it('renders the detail for a store entry with a resolved printing', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderPage('e1')
    expect(screen.getByRole('heading', { name: 'Detalle de carta' })).toBeInTheDocument()
    expect(screen.getByAltText('Test Set #123')).toBeInTheDocument()
    expect(screen.getByText(/Cantidad:/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/')
  })

  it('shows the not-found state and a link back to the binder for an unknown id', () => {
    renderPage('missing')
    expect(screen.getByText(/no encontrada/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/')
  })

  it('shows a loading state while the printing is pending', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({ data: undefined, isPending: true, isError: false })
    renderPage('e1')
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument()
  })

  it('shows an error state when the printing fails or is missing', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({ data: undefined, isPending: false, isError: true })
    renderPage('e1')
    expect(screen.getByText(/No se pudo cargar/i)).toBeInTheDocument()
  })
})
