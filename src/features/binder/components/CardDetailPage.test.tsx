import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import CardDetailPage from '@/features/binder/components/CardDetailPage'
import type { BinderEntry, Printing } from '@/shared/types/mtg'

vi.mock('@/features/catalog/catalogQueries', () => ({
  usePrinting: vi.fn(),
}))

const { stateMock } = vi.hoisted(() => ({
  stateMock: {
    entries: [] as BinderEntry[],
    updateEntryDetails: vi.fn(),
  },
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
    expect(screen.getByRole('link', { name: /Volver/ })).toHaveAttribute('href', '/')
  })

  it('shows the not-found state and a link back to the binder for an unknown id', () => {
    renderPage('missing')
    expect(screen.getByText(/no encontrada/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver/ })).toHaveAttribute('href', '/')
  })

  it('shows a loading skeleton while the printing is pending', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({ data: undefined, isPending: true, isError: false })
    renderPage('e1')
    expect(screen.getByLabelText('Cargando carta')).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it('shows an error state when the printing fails or is missing', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({ data: undefined, isPending: false, isError: true })
    renderPage('e1')
    expect(screen.getByText(/No se pudo cargar/i)).toBeInTheDocument()
  })
})

describe('CardDetailPage finish and notes', () => {
  beforeEach(() => {
    stateMock.entries = []
    stateMock.updateEntryDetails = vi.fn()
    mockUsePrinting.mockReset()
    mockUsePrinting.mockReturnValue({ data: undefined, isPending: false, isError: false })
  })

  it('shows finish, notes and the foil market price of the copy', () => {
    stateMock.entries = [
      { ...entry, finish: 'foil', notes: 'Signed by the artist' },
    ]
    mockUsePrinting.mockReturnValue({
      data: { ...printing, prices: { usd: '1.50', usdFoil: '4.00' } },
      isPending: false,
      isError: false,
    })
    renderPage('e1')

    expect(screen.getByText('Foil')).toBeInTheDocument()
    expect(screen.getByText('Signed by the artist')).toBeInTheDocument()
    // A foil copy is priced with the foil market value, not the regular one.
    expect(screen.getByText('4.00')).toBeInTheDocument()
  })

  it('shows "No declarado" for entries that predate the finish field', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderPage('e1')

    expect(screen.getByText('No declarado')).toBeInTheDocument()
  })

  it('saves edited finish and notes through the store action', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({
      data: { ...printing, finishes: ['nonfoil', 'foil'] },
      isPending: false,
      isError: false,
    })
    renderPage('e1')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Acabado' }), {
      target: { value: 'foil' },
    })
    fireEvent.change(screen.getByLabelText('Notas'), {
      target: { value: 'Dentada atrás' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(stateMock.updateEntryDetails).toHaveBeenCalledWith('e1', {
      finish: 'foil',
      notes: 'Dentada atrás',
    })
  })

  it('keeps the finish undeclared when only notes are edited', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderPage('e1')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Notas'), {
      target: { value: 'nueva' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(stateMock.updateEntryDetails).toHaveBeenCalledWith('e1', {
      finish: undefined,
      notes: 'nueva',
    })
  })

  it('offers only finishes the printing actually has', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderPage('e1')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['No declarado', 'Nonfoil'])
  })

  it('discards edits when cancelled', () => {
    stateMock.entries = [{ ...entry, finish: 'nonfoil' }]
    mockUsePrinting.mockReturnValue({
      data: { ...printing, finishes: ['nonfoil', 'foil'] },
      isPending: false,
      isError: false,
    })
    renderPage('e1')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Acabado' }), {
      target: { value: 'foil' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(stateMock.updateEntryDetails).not.toHaveBeenCalled()
    expect(screen.getByText('Nonfoil')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Guardar' }),
    ).not.toBeInTheDocument()
  })
})
