import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
import WantEntryForm from '@/features/wants/components/WantEntryForm'
import type { OracleCard } from '@/shared/types/mtg'

interface QueryState<T> {
  data: T | null
  isPending: boolean
  isError: boolean
}

const states = vi.hoisted(() => ({
  search: {
    data: null,
    isPending: false,
    isError: false,
  } as QueryState<OracleCard[]>,
  named: {
    data: null,
    isPending: false,
    isError: false,
  } as QueryState<OracleCard>,
}))

const addWantSpy = vi.hoisted(() => vi.fn())

vi.mock('@/features/catalog/catalogQueries', () => ({
  useSearchCards: () => states.search,
  useNamed: () => states.named,
}))

vi.mock('@/features/binder/state/binderStore', () => ({
  useBinderStore: (
    selector: (state: { addWant: typeof addWantSpy }) => unknown,
  ) => selector({ addWant: addWantSpy }),
}))

function makeCard(overrides: Partial<OracleCard> = {}): OracleCard {
  return {
    oracleId: 'oracle-bolt',
    name: 'Lightning Bolt',
    cmc: 1,
    colors: ['R'],
    typeLine: 'Instant',
    oracleText: 'Deal 3 damage to any target.',
    imageNormal: 'https://img.example/bolt.jpg',
    ...overrides,
  }
}

function renderForm(onSubmit?: () => void) {
  return render(<WantEntryForm onSubmit={onSubmit} />)
}

function typeQuery(value: string) {
  fireEvent.change(screen.getByPlaceholderText('Buscar carta...'), {
    target: { value },
  })
}

beforeEach(() => {
  states.search = { data: null, isPending: false, isError: false }
  states.named = { data: null, isPending: false, isError: false }
  addWantSpy.mockReset()
})

describe('WantEntryForm search flow', () => {
  it('renders a search input without raw id fields or a verify button', () => {
    renderForm()
    expect(screen.getByPlaceholderText('Buscar carta...')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Ver carta' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('ID de oráculo')).not.toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('ID de impresión (opcional)'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Agregar a Deseos' }),
    ).not.toBeInTheDocument()
  })

  it('loads the full card when its suggestion name is clicked', async () => {
    states.search = { data: [makeCard()], isPending: false, isError: false }
    renderForm()
    typeQuery('light')
    fireEvent.click(screen.getByRole('button', { name: 'Lightning Bolt' }))

    expect(screen.getByPlaceholderText('Buscar carta...')).toHaveValue(
      'Lightning Bolt',
    )
    expect(
      await screen.findByRole('img', { name: 'Lightning Bolt' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Agregar a Deseos' }),
    ).toBeInTheDocument()
  })

  it('shows a loading skeleton while the full-name lookup is pending', () => {
    states.named = { data: null, isPending: true, isError: false }
    renderForm()
    typeQuery('lightning bolt')
    fireEvent.keyDown(screen.getByPlaceholderText('Buscar carta...'), {
      key: 'Enter',
    })

    const skeleton = screen.getByLabelText('Cargando carta')
    expect(skeleton).toHaveAttribute('aria-busy', 'true')
    expect(
      screen.queryByRole('button', { name: 'Ver carta' }),
    ).not.toBeInTheDocument()
  })

  it('shows a three-dot loader while the search is pending', () => {
    states.search = { data: null, isPending: true, isError: false }
    renderForm()
    typeQuery('light')

    const loader = screen.getByRole('status', { name: 'Buscando…' })
    expect(loader).toBeInTheDocument()
    expect(loader.querySelectorAll('.want-loader-dot')).toHaveLength(3)
    expect(screen.queryByText('Buscando…')).not.toBeInTheDocument()
  })

  it('loads the card image below the form when the full name is submitted with Enter', async () => {
    states.named = { data: makeCard(), isPending: false, isError: false }
    renderForm()
    typeQuery('lightning bolt')
    fireEvent.keyDown(screen.getByPlaceholderText('Buscar carta...'), {
      key: 'Enter',
    })

    expect(await screen.findByRole('img', { name: 'Lightning Bolt' })).toHaveAttribute(
      'src',
      'https://img.example/bolt.jpg',
    )
    expect(
      screen.getByText('Deal 3 damage to any target.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Agregar a Deseos' }),
    ).toBeInTheDocument()
  })

  it('hides the preview when the search input is emptied', async () => {
    states.named = { data: makeCard(), isPending: false, isError: false }
    renderForm()
    typeQuery('lightning bolt')
    fireEvent.keyDown(screen.getByPlaceholderText('Buscar carta...'), {
      key: 'Enter',
    })
    expect(
      await screen.findByRole('img', { name: 'Lightning Bolt' }),
    ).toBeInTheDocument()

    typeQuery('')

    await waitFor(() =>
      expect(
        screen.queryByRole('img', { name: 'Lightning Bolt' }),
      ).not.toBeInTheDocument(),
    )
    expect(
      screen.queryByRole('button', { name: 'Agregar a Deseos' }),
    ).not.toBeInTheDocument()
  })

  it('does not list the already selected card among the suggestions', async () => {
    states.search = {
      data: [
        makeCard(),
        makeCard({ oracleId: 'oracle-chain', name: 'Chain Lightning' }),
      ],
      isPending: false,
      isError: false,
    }
    states.named = { data: makeCard(), isPending: false, isError: false }
    renderForm()
    typeQuery('lightning bolt')
    fireEvent.keyDown(screen.getByPlaceholderText('Buscar carta...'), {
      key: 'Enter',
    })
    await screen.findByRole('img', { name: 'Lightning Bolt' })

    // A new partial query reopens the suggestions for the same result set.
    typeQuery('light')

    expect(
      await screen.findByRole('button', { name: 'Chain Lightning' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Lightning Bolt' }),
    ).not.toBeInTheDocument()
  })

  it('adds the verified card as a want, then resets the form and reports completion', async () => {
    states.named = { data: makeCard(), isPending: false, isError: false }
    const onSubmitted = vi.fn()
    renderForm(onSubmitted)
    typeQuery('lightning bolt')
    fireEvent.keyDown(screen.getByPlaceholderText('Buscar carta...'), {
      key: 'Enter',
    })
    await screen.findByRole('img', { name: 'Lightning Bolt' })

    fireEvent.change(screen.getByPlaceholderText('Cantidad'), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar a Deseos' }))

    // react-hook-form resolves validation asynchronously before submit runs.
    await waitFor(() =>
      expect(addWantSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          oracleId: 'oracle-bolt',
          // Oracle-level display snapshot taken at add time: the list cannot
          // resolve a card by oracle id (no such endpoint), so name, type and
          // representative image ride along on the want.
          name: 'Lightning Bolt',
          typeLine: 'Instant',
          imageNormal: 'https://img.example/bolt.jpg',
          quantity: 3,
          priority: 'normal',
        }),
      ),
    )
    expect(onSubmitted).toHaveBeenCalledTimes(1)
    // The preview leaves through its exit transition, so wait for removal.
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Agregar a Deseos' }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByPlaceholderText('Buscar carta...')).toHaveValue('')
  })

  it('shows an alert and no preview when the card lookup fails', () => {
    states.named = { data: null, isPending: false, isError: true }
    renderForm()
    typeQuery('lightning bolt')
    fireEvent.keyDown(screen.getByPlaceholderText('Buscar carta...'), {
      key: 'Enter',
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo cargar la carta.',
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Agregar a Deseos' }),
    ).not.toBeInTheDocument()
  })
})

describe('WantEntryForm card zoom', () => {
  async function openPreview() {
    states.named = { data: makeCard(), isPending: false, isError: false }
    renderForm()
    typeQuery('lightning bolt')
    fireEvent.keyDown(screen.getByPlaceholderText('Buscar carta...'), {
      key: 'Enter',
    })
    return screen.findByRole('button', { name: 'Ampliar Lightning Bolt' })
  }

  it('exposes the preview as a focusable "Ampliar" button', async () => {
    const card = await openPreview()
    expect(card).toHaveAttribute('tabindex', '0')
    expect(
      within(card).getByRole('img', { name: 'Lightning Bolt' }),
    ).toBeInTheDocument()
  })

  it('opens a zoom dialog holding the large card on click', async () => {
    const card = await openPreview()
    fireEvent.click(card)

    const dialog = await screen.findByRole('dialog', {
      name: 'Lightning Bolt',
    })
    expect(within(dialog).getByRole('img', { name: 'Lightning Bolt' })).toBeInTheDocument()
  })

  it('closes the zoom dialog on Escape, overlay click and the close button', async () => {
    const card = await openPreview()
    fireEvent.click(card)
    const dialog = await screen.findByRole('dialog', {
      name: 'Lightning Bolt',
    })

    // Closing animates a fade first (AnimatePresence), so the dialog unmounts
    // after the exit transition: wait for the removal instead of asserting it.
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )

    fireEvent.click(card)
    const viaOverlay = await screen.findByRole('dialog', {
      name: 'Lightning Bolt',
    })
    fireEvent.click(viaOverlay.parentElement as HTMLElement)
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )

    fireEvent.click(card)
    const reopened = await screen.findByRole('dialog', {
      name: 'Lightning Bolt',
    })
    fireEvent.click(within(reopened).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })
})
