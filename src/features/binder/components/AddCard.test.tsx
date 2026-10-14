import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AddCard from '@/features/binder/components/AddCard'
import { useBinderStore } from '@/features/binder/state/binderStore'
import type { OracleCard, Printing } from '@/shared/types/mtg'

interface QueryState<T> {
  data: T[] | null
  isPending: boolean
  isError: boolean
}

const states = vi.hoisted(() => ({
  search: { data: null, isPending: false, isError: false } as QueryState<OracleCard>,
  printings: { data: null, isPending: false, isError: false } as QueryState<Printing>,
}))

vi.mock('@/features/catalog/catalogQueries', () => ({
  useSearchCards: () => states.search,
  usePrintings: () => states.printings,
}))

function renderAddCard(onClose?: () => void) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <AddCard onClose={onClose} />
    </QueryClientProvider>
  )
}

function makeCard(overrides: Partial<OracleCard> = {}): OracleCard {
  return {
    oracleId: 'oracle-bolt',
    name: 'Lightning Bolt',
    cmc: 1,
    colors: ['R'],
    typeLine: 'Instant',
    ...overrides,
  }
}

function makePrinting(overrides: Partial<Printing> = {}): Printing {
  return {
    id: 'printing-1',
    oracleId: 'oracle-bolt',
    setCode: 'ALP',
    setName: 'Alpha',
    collectorNumber: '1',
    rarity: 'common',
    finishes: ['nonfoil'],
    imageSmall: 'small.jpg',
    imageNormal: 'normal.jpg',
    imageLarge: 'large.jpg',
    ...overrides,
  }
}

beforeEach(() => {
  states.search = { data: null, isPending: false, isError: false }
  states.printings = { data: null, isPending: false, isError: false }
})

async function typeQuery(value: string) {
  fireEvent.change(screen.getByPlaceholderText('Buscar carta...'), {
    target: { value },
  })
}

describe('AddCard dialog accessibility', () => {
  it('exposes a dialog with the accessible name "Agregar carta"', () => {
    renderAddCard()
    expect(screen.getByRole('dialog', { name: 'Agregar carta' })).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    renderAddCard(onClose)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves focus into the search input on mount', () => {
    renderAddCard()
    expect(screen.getByPlaceholderText('Buscar carta...')).toHaveFocus()
  })

  it('restores focus to the previously focused trigger on unmount', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <button>Trigger</button>
      </QueryClientProvider>
    )
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    trigger.focus()
    expect(trigger).toHaveFocus()

    rerender(
      <QueryClientProvider client={client}>
        <button>Trigger</button>
        <AddCard />
      </QueryClientProvider>
    )
    expect(screen.getByPlaceholderText('Buscar carta...')).toHaveFocus()

    rerender(
      <QueryClientProvider client={client}>
        <button>Trigger</button>
      </QueryClientProvider>
    )
    expect(trigger).toHaveFocus()
  })
})

describe('AddCard search result states', () => {
  it('shows a loading state while a non-empty search is pending', () => {
    states.search = { data: null, isPending: true, isError: false }
    renderAddCard()
    typeQuery('bolt')
    expect(screen.getByRole('status', { name: 'Buscando…' })).toBeInTheDocument()
  })

  it('shows nothing while the query is empty, even if the query reports pending', () => {
    states.search = { data: null, isPending: true, isError: false }
    renderAddCard()
    expect(screen.queryByText('Buscando…')).not.toBeInTheDocument()
  })

  it('shows an error message when the search fails', () => {
    states.search = { data: null, isPending: false, isError: true }
    renderAddCard()
    typeQuery('bolt')
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo buscar. Intenta de nuevo.')
  })

  it('shows an empty state when the search succeeds with no results', () => {
    states.search = { data: [], isPending: false, isError: false }
    renderAddCard()
    typeQuery('zzz')
    expect(screen.getByText('Sin resultados para tu búsqueda.')).toBeInTheDocument()
  })

  it('renders a button per result when the search succeeds', () => {
    states.search = { data: [makeCard()], isPending: false, isError: false }
    renderAddCard()
    typeQuery('bolt')
    expect(screen.getByRole('button', { name: 'Lightning Bolt' })).toBeInTheDocument()
  })
})

describe('AddCard printing picker', () => {
  function editionOptions() {
    return Array.from(
      screen.getByRole('combobox', { name: 'Edición' }).querySelectorAll('option'),
    ).filter((option) => option.value !== '')
  }

  function numberOptions() {
    return Array.from(
      screen
        .getByRole('combobox', { name: 'Número de coleccionista' })
        .querySelectorAll('option'),
    )
  }

  /** Open the dialog and pick the card, landing on the printing step. */
  function pickCard() {
    renderAddCard()
    typeQuery('bolt')
    fireEvent.click(screen.getByRole('button', { name: 'Lightning Bolt' }))
  }

  it('offers every edition in its own select, with no filter and no cap', () => {
    states.search = { data: [makeCard()], isPending: false, isError: false }
    states.printings = {
      data: Array.from({ length: 40 }, (_, i) =>
        makePrinting({ id: `p${i}`, setName: `Set ${i + 1}`, collectorNumber: String(i + 1) })
      ),
      isPending: false,
      isError: false,
    }
    pickCard()

    expect(screen.queryByLabelText('Buscar edición')).not.toBeInTheDocument()
    expect(editionOptions()).toHaveLength(40)
    expect(screen.queryByRole('option', { name: /Mostrando/ })).not.toBeInTheDocument()
  })

  it('lists the collector numbers of the chosen edition, sorted numerically', () => {
    states.search = { data: [makeCard()], isPending: false, isError: false }
    states.printings = {
      data: [
        makePrinting({ id: 'p2', collectorNumber: '2' }),
        makePrinting({ id: 'p10', collectorNumber: '10' }),
        makePrinting({ id: 'p1', collectorNumber: '1' }),
      ],
      isPending: false,
      isError: false,
    }
    pickCard()

    expect(numberOptions().map((option) => option.textContent)).toEqual(['#1', '#2', '#10'])
  })

  it('switches the numbers and the preview when another edition is chosen', () => {
    states.search = { data: [makeCard()], isPending: false, isError: false }
    states.printings = {
      data: [
        makePrinting({ id: 'printing-1', setName: 'Alpha', collectorNumber: '1' }),
        makePrinting({
          id: 'printing-2',
          setName: 'Beta',
          collectorNumber: '2',
          imageLarge: 'beta.jpg',
        }),
      ],
      isPending: false,
      isError: false,
    }
    pickCard()

    fireEvent.change(screen.getByRole('combobox', { name: 'Edición' }), {
      target: { value: 'Beta' },
    })

    expect(numberOptions().map((option) => option.textContent)).toEqual(['#2'])
    expect(screen.getByRole('combobox', { name: 'Número de coleccionista' })).toHaveValue('printing-2')
    expect(screen.getByRole('img', { name: 'Beta #2' })).toHaveAttribute('src', 'beta.jpg')
  })
})

describe('AddCard default printing selection', () => {
  beforeEach(() => {
    states.search = { data: [makeCard()], isPending: false, isError: false }
  })

  it('pre-selects the first edition and its first printing when the list loads', () => {
    states.printings = {
      data: [makePrinting({ finishes: ['nonfoil'] })],
      isPending: false,
      isError: false,
    }
    renderAddCard()
    typeQuery('bolt')
    fireEvent.click(screen.getByRole('button', { name: 'Lightning Bolt' }))

    expect(screen.getByRole('combobox', { name: 'Edición' })).toHaveValue('Alpha')
    expect(screen.getByRole('combobox', { name: 'Número de coleccionista' })).toHaveValue('printing-1')
    expect(screen.getByRole('img', { name: 'Alpha #1' })).toHaveAttribute('src', 'large.jpg')
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeEnabled()
  })

  it('keeps the number the user picks instead of re-selecting the first one', () => {
    states.printings = {
      data: [
        makePrinting({ id: 'printing-1', collectorNumber: '1' }),
        makePrinting({ id: 'printing-2', collectorNumber: '2' }),
      ],
      isPending: false,
      isError: false,
    }
    renderAddCard()
    typeQuery('bolt')
    fireEvent.click(screen.getByRole('button', { name: 'Lightning Bolt' }))

    const select = screen.getByRole('combobox', { name: 'Número de coleccionista' })
    expect(select).toHaveValue('printing-1')
    fireEvent.change(select, { target: { value: 'printing-2' } })

    expect(select).toHaveValue('printing-2')
    expect(screen.getByRole('img', { name: 'Alpha #2' })).toHaveAttribute('src', 'large.jpg')
  })
})

describe('AddCard finish', () => {
  const addEntrySpy = vi.fn()

  beforeEach(() => {
    useBinderStore.setState({ addEntry: addEntrySpy })
    addEntrySpy.mockClear()
    states.search = { data: [makeCard()], isPending: false, isError: false }
  })

  /** Open the dialog, pick the card and select its only printing. */
  function selectPrinting(finishes: string[]) {
    states.printings = {
      data: [makePrinting({ finishes })],
      isPending: false,
      isError: false,
    }
    renderAddCard()
    typeQuery('bolt')
    fireEvent.click(screen.getByRole('button', { name: 'Lightning Bolt' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Número de coleccionista' }), {
      target: { value: 'printing-1' },
    })
  }

  it('offers a Foil checkbox when the printing has exactly nonfoil and foil', () => {
    selectPrinting(['nonfoil', 'foil'])

    const toggle = screen.getByRole('checkbox', { name: 'Foil' })
    expect(toggle).not.toBeChecked()
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(addEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({ printingId: 'printing-1', finish: 'foil' }),
    )
  })

  it('stores nonfoil when the Foil checkbox is left unchecked', () => {
    selectPrinting(['nonfoil', 'foil'])

    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(addEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({ printingId: 'printing-1', finish: 'nonfoil' }),
    )
  })

  it('keeps the select when etched is one of the finishes', () => {
    selectPrinting(['nonfoil', 'foil', 'etched'])

    expect(
      screen.queryByRole('checkbox', { name: 'Foil' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Acabado' })).toHaveValue('nonfoil')
  })

  it('auto-assigns the only finish without showing a select', () => {
    selectPrinting(['foil'])

    expect(
      screen.queryByRole('combobox', { name: 'Acabado' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(addEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({ printingId: 'printing-1', finish: 'foil' }),
    )
  })

  it('ignores finishes the app does not model (e.g. digital)', () => {
    selectPrinting(['digital'])

    expect(
      screen.queryByRole('combobox', { name: 'Acabado' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(addEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({ printingId: 'printing-1', finish: undefined }),
    )
  })
})

describe('AddCard quantity', () => {
  const addEntrySpy = vi.fn()

  beforeEach(() => {
    useBinderStore.setState({ addEntry: addEntrySpy })
    addEntrySpy.mockClear()
    states.search = { data: [makeCard()], isPending: false, isError: false }
    states.printings = {
      data: [makePrinting({ finishes: ['nonfoil'] })],
      isPending: false,
      isError: false,
    }
  })

  it('adds the card with the chosen quantity', () => {
    renderAddCard()
    typeQuery('bolt')
    fireEvent.click(screen.getByRole('button', { name: 'Lightning Bolt' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Número de coleccionista' }), {
      target: { value: 'printing-1' },
    })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Cantidad' }), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(addEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({ printingId: 'printing-1', quantity: 3 }),
    )
  })

  it('defaults to a quantity of one', () => {
    renderAddCard()
    typeQuery('bolt')
    fireEvent.click(screen.getByRole('button', { name: 'Lightning Bolt' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Número de coleccionista' }), {
      target: { value: 'printing-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(addEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 1 }),
    )
  })
})

describe('AddCard printing preview', () => {
  beforeEach(() => {
    states.search = { data: [makeCard()], isPending: false, isError: false }
    states.printings = {
      data: [makePrinting({ finishes: ['nonfoil'] })],
      isPending: false,
      isError: false,
    }
  })

  it('previews the selected printing image', () => {
    renderAddCard()
    typeQuery('bolt')
    fireEvent.click(screen.getByRole('button', { name: 'Lightning Bolt' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Número de coleccionista' }), {
      target: { value: 'printing-1' },
    })

    expect(screen.getByRole('img', { name: 'Alpha #1' })).toHaveAttribute(
      'src',
      'large.jpg',
    )
  })

  it('updates the preview when another number is selected', () => {
    states.printings = {
      data: [
        makePrinting({ id: 'printing-1', collectorNumber: '1' }),
        makePrinting({ id: 'printing-2', collectorNumber: '2', imageLarge: 'beta.jpg' }),
      ],
      isPending: false,
      isError: false,
    }
    renderAddCard()
    typeQuery('bolt')
    fireEvent.click(screen.getByRole('button', { name: 'Lightning Bolt' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Número de coleccionista' }), {
      target: { value: 'printing-2' },
    })

    expect(screen.getByRole('img', { name: 'Alpha #2' })).toHaveAttribute(
      'src',
      'beta.jpg',
    )
  })
})

describe('AddCard background scroll', () => {
  it('locks the page behind while open and restores it on close', () => {
    const { unmount } = renderAddCard()

    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})
