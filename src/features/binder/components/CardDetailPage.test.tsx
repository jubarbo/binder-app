import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { toast } from 'react-toastify'
import CardDetailPage from '@/features/binder/components/CardDetailPage'
import type { BinderEntry, Printing } from '@/shared/types/mtg'

vi.mock('@/features/catalog/catalogQueries', () => ({
  usePrinting: vi.fn(),
}))

const { stateMock } = vi.hoisted(() => ({
  stateMock: {
    entries: [] as BinderEntry[],
    updateEntryDetails: vi.fn(),
    updateQuantity: vi.fn(),
    removeEntry: vi.fn(),
  },
}))

// The toast container lives in AppLayout, which the page test does not render;
// assert the notification call instead of the rendered toast.
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn() },
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
  name: 'Test Card',
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
  // The detail renders the wanters section, which queries through its port.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/card/${id}`]}>
        <Routes>
          <Route path="/card/:entryId" element={<CardDetailPage />} />
          <Route path="/" element={<div>binder-home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
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
    expect(screen.getByRole('heading', { level: 1, name: 'Test Card — Test Set' })).toBeInTheDocument()
    expect(screen.getByAltText('Test Set #123')).toBeInTheDocument()
    expect(screen.getByText(/Cantidad:/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'La buscan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver/ })).toHaveAttribute('href', '/')
  })

  it('renders a flip with the back face for a double-faced printing', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({
      data: {
        ...printing,
        name: 'Bala Ged Recovery // Bala Ged Sanctuary',
        imageLargeBack: 'http://example.com/l-back.png',
      },
      isPending: false,
      isError: false,
    })
    renderPage('e1')

    expect(document.querySelector('.card-flip')).toBeInTheDocument()
    const backImg = document.querySelector<HTMLImageElement>('.card-face--back img')
    expect(backImg).not.toBeNull()
    expect(backImg).toHaveAttribute('src', 'http://example.com/l-back.png')
  })

  it('renders no flip for a single-faced printing', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderPage('e1')

    expect(document.querySelector('.card-flip')).not.toBeInTheDocument()
    // The front image is still rendered directly.
    expect(screen.getByAltText('Test Set #123')).toBeInTheDocument()
  })

  it('applies the foil to both faces of a double-faced foil card', () => {
    stateMock.entries = [{ ...entry, finish: 'foil' }]
    mockUsePrinting.mockReturnValue({
      data: { ...printing, imageLargeBack: 'http://example.com/l-back.png' },
      isPending: false,
      isError: false,
    })
    renderPage('e1')

    // One band per face: the finish rides along when the card turns.
    expect(document.querySelectorAll('.card-foil')).toHaveLength(2)
  })

  it('keeps a single foil band for a single-faced foil card', () => {
    stateMock.entries = [{ ...entry, finish: 'foil' }]
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderPage('e1')

    expect(document.querySelectorAll('.card-foil')).toHaveLength(1)
  })

  it('falls back to the printing label when the card has no name', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({
      data: { ...printing, name: '' },
      isPending: false,
      isError: false,
    })
    renderPage('e1')
    expect(screen.getByRole('heading', { level: 1, name: 'Test Set #123' })).toBeInTheDocument()
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
    stateMock.updateQuantity = vi.fn()
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

  it('offers a foil checkbox instead of a finish select while editing', () => {
    stateMock.entries = [{ ...entry, finish: 'nonfoil' }]
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderPage('e1')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    // The select never comes back: the checkbox is the only finish control.
    expect(
      screen.queryByRole('combobox', { name: 'Acabado' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Foil' })).toBeInTheDocument()
    expect(screen.getByLabelText('Notas')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Cantidad' })).toBeInTheDocument()
  })

  it('marks the copy as foil from the checkbox', () => {
    stateMock.entries = [{ ...entry, finish: 'nonfoil', notes: 'ok' }]
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderPage('e1')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Foil' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(stateMock.updateEntryDetails).toHaveBeenCalledWith('e1', {
      notes: 'ok',
      finish: 'foil',
    })
  })

  it('unmarks foil back to nonfoil from the checkbox', () => {
    stateMock.entries = [{ ...entry, finish: 'foil', notes: 'ok' }]
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderPage('e1')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Foil' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(stateMock.updateEntryDetails).toHaveBeenCalledWith('e1', {
      notes: 'ok',
      finish: 'nonfoil',
    })
  })

  it('leaves an untouched finish alone when only notes are edited', () => {
    stateMock.entries = [{ ...entry, finish: undefined, notes: 'vieja' }]
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderPage('e1')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Notas'), {
      target: { value: 'nueva' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    // Unchecked is not a statement about a copy that never declared one: the
    // patch must not invent a finish the user never chose.
    expect(stateMock.updateEntryDetails).toHaveBeenCalledWith('e1', {
      notes: 'nueva',
    })
    expect(Object.keys(stateMock.updateEntryDetails.mock.calls[0][1])).toEqual([
      'notes',
    ])
  })

  it('saves edited notes through the store action', () => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReturnValue({
      data: { ...printing, finishes: ['nonfoil', 'foil'] },
      isPending: false,
      isError: false,
    })
    renderPage('e1')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Notas'), {
      target: { value: 'Dentada atrás' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(stateMock.updateEntryDetails).toHaveBeenCalledWith('e1', {
      notes: 'Dentada atrás',
    })
  })

  it('leaves a declared finish untouched when only notes are edited', () => {
    stateMock.entries = [{ ...entry, finish: 'foil' }]
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
    renderPage('e1')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Notas'), {
      target: { value: 'nueva' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    // The patch carries notes only: a partial merge keeps the declared foil.
    expect(stateMock.updateEntryDetails).toHaveBeenCalledWith('e1', {
      notes: 'nueva',
    })
    expect(Object.keys(stateMock.updateEntryDetails.mock.calls[0][1])).toEqual([
      'notes',
    ])
  })

  it('discards edits when cancelled', () => {
    stateMock.entries = [{ ...entry, finish: 'nonfoil', notes: 'vieja' }]
    mockUsePrinting.mockReturnValue({
      data: { ...printing, finishes: ['nonfoil', 'foil'] },
      isPending: false,
      isError: false,
    })
    renderPage('e1')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Notas'), {
      target: { value: 'nueva' },
    })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Cantidad' }), {
      target: { value: '5' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(stateMock.updateEntryDetails).not.toHaveBeenCalled()
    expect(stateMock.updateQuantity).not.toHaveBeenCalled()
    expect(screen.getByText('Nonfoil')).toBeInTheDocument()
    expect(screen.getByText('vieja')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Guardar' }),
    ).not.toBeInTheDocument()
  })
})

describe('CardDetailPage rocking motion', () => {
  beforeEach(() => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReset()
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
  })

  it('rocks the enlarged image with the shared motion hook', () => {
    const { container } = renderPage('e1')

    const media = container.querySelector('.card-detail-media-card')
    expect(media).not.toBeNull()
    // The glare layer only exists while the rock hook is active.
    expect(media?.querySelector('.card-glare')).not.toBeNull()

    // Rock/lift handlers must never throw; the rocking itself is visual-only.
    fireEvent.mouseEnter(media as Element)
    fireEvent.mouseMove(media as Element, { clientX: 30, clientY: 40 })
    fireEvent.mouseLeave(media as Element)
    expect(screen.getByAltText('Test Set #123')).toBeInTheDocument()
  })
})

describe('CardDetailPage zoom', () => {
  beforeEach(() => {
    stateMock.entries = [entry]
    mockUsePrinting.mockReset()
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
  })

  function mediaCard(container: HTMLElement) {
    return container.querySelector('.card-detail-media-card') as HTMLElement
  }

  it('opens the zoom modal when the enlarged image is clicked', async () => {
    const { container } = renderPage('e1')

    fireEvent.click(mediaCard(container))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('img')).toHaveAttribute(
      'src',
      'http://example.com/l.png',
    )
    // Image-only modal: no caption, no visible controls — Escape and the
    // scrim are the way out.
    expect(within(dialog).queryByRole('heading')).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button')).not.toBeInTheDocument()
    await waitFor(() => expect(dialog).toHaveFocus())
  })

  it('closes the zoom with Escape and restores focus to the image', async () => {
    const { container } = renderPage('e1')
    const media = mediaCard(container)
    fireEvent.click(media)
    await screen.findByRole('dialog')

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(media).toHaveFocus()
  })

  it('closes the zoom when the scrim is clicked', async () => {
    const { container } = renderPage('e1')
    fireEvent.click(mediaCard(container))
    await screen.findByRole('dialog')

    const scrim = document.querySelector('.zoom-overlay') as HTMLElement
    fireEvent.click(scrim)

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('opens the zoom from the keyboard as well', async () => {
    const { container } = renderPage('e1')

    fireEvent.keyDown(mediaCard(container), { key: 'Enter' })

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('CardDetailPage foil surface', () => {
  beforeEach(() => {
    mockUsePrinting.mockReset()
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
  })

  function mediaCard(container: HTMLElement) {
    return container.querySelector('.card-detail-media-card') as HTMLElement
  }

  it('paints the holographic layer over the detail image for a foil copy', () => {
    stateMock.entries = [{ ...entry, finish: 'foil' }]
    const { container } = renderPage('e1')

    expect(mediaCard(container).querySelector('.card-foil')).not.toBeNull()
    expect(mediaCard(container).querySelector('.card-foil-band')).not.toBeNull()
  })

  it('keeps the detail image flat for a copy that is not foil', () => {
    stateMock.entries = [{ ...entry, finish: 'nonfoil' }]
    const { container } = renderPage('e1')

    expect(mediaCard(container).querySelector('.card-foil')).toBeNull()
  })

  it('carries the layer into the zoom modal', async () => {
    stateMock.entries = [{ ...entry, finish: 'foil' }]
    const { container } = renderPage('e1')

    fireEvent.click(mediaCard(container))
    const dialog = await screen.findByRole('dialog')

    expect(dialog.querySelector('.card-foil')).not.toBeNull()
    expect(dialog.querySelector('.card-foil-band')).not.toBeNull()
  })

  it('leaves the zoom modal flat for a copy that is not foil', async () => {
    stateMock.entries = [{ ...entry, finish: 'nonfoil' }]
    const { container } = renderPage('e1')

    fireEvent.click(mediaCard(container))
    const dialog = await screen.findByRole('dialog')

    expect(dialog.querySelector('.card-foil')).toBeNull()
  })
})

describe('CardDetailPage quantity editing', () => {
  beforeEach(() => {
    stateMock.entries = [entry]
    stateMock.updateEntryDetails = vi.fn()
    stateMock.updateQuantity = vi.fn()
    stateMock.removeEntry = vi.fn()
    vi.mocked(toast.success).mockClear()
    mockUsePrinting.mockReset()
    mockUsePrinting.mockReturnValue({ data: printing, isPending: false, isError: false })
  })

  /** Open the edit panel and set the quantity field. */
  function editQuantity(value: string) {
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Cantidad' }), {
      target: { value },
    })
  }

  it('persists a quantity above zero through the store', () => {
    renderPage('e1')
    editQuantity('5')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(stateMock.updateQuantity).toHaveBeenCalledWith('e1', 5)
    expect(stateMock.removeEntry).not.toHaveBeenCalled()
  })

  it('asks for confirmation instead of persisting a quantity of zero', () => {
    renderPage('e1')
    editQuantity('0')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Si dejas la cantidad en 0, Test Set #123 se eliminará de tu binder.',
    )
    expect(stateMock.removeEntry).not.toHaveBeenCalled()
    expect(stateMock.updateQuantity).not.toHaveBeenCalled()
  })

  it('removes the entry, notifies and returns to the binder when confirmed', () => {
    renderPage('e1')
    editQuantity('0')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(stateMock.removeEntry).toHaveBeenCalledWith('e1')
    expect(toast.success).toHaveBeenCalledWith('Carta eliminada')
    expect(screen.getByText('binder-home')).toBeInTheDocument()
  })

  it('keeps the entry and the draft when the removal is rejected', async () => {
    renderPage('e1')
    editQuantity('0')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))

    expect(stateMock.removeEntry).not.toHaveBeenCalled()
    expect(stateMock.updateQuantity).not.toHaveBeenCalled()
    // Still editing with the draft intact, so the user can fix the number.
    expect(screen.getByRole('spinbutton', { name: 'Cantidad' })).toHaveValue(0)
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('blocks saving while the quantity field is empty', () => {
    renderPage('e1')
    editQuantity('')

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })
})
