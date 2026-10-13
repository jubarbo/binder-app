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
  it('shows a loading message while a non-empty search is pending', () => {
    states.search = { data: null, isPending: true, isError: false }
    renderAddCard()
    typeQuery('bolt')
    expect(screen.getByText('Buscando…')).toBeInTheDocument()
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

describe('AddCard printings', () => {
  it('sorts printings by set then collector number and limits to 25 with a notice', () => {
    states.search = { data: [makeCard()], isPending: false, isError: false }
    states.printings = {
      data: Array.from({ length: 40 }, (_, i) =>
        makePrinting({ id: `p${i}`, collectorNumber: String(i + 1) })
      ),
      isPending: false,
      isError: false,
    }
    renderAddCard()
    typeQuery('bolt')
    fireEvent.click(screen.getByRole('button', { name: 'Lightning Bolt' }))

    const select = screen.getByRole('combobox')
    const options = Array.from(select.querySelectorAll('option'))

    expect(screen.getByRole('option', { name: 'Mostrando 25 de 40 ediciones' })).toBeDisabled()

    const printingOptions = options.filter((option) => option.value !== '')
    expect(printingOptions).toHaveLength(25)
    expect(printingOptions.map((option) => option.textContent)).toEqual(
      Array.from({ length: 25 }, (_, i) => `Alpha #${i + 1}`)
    )
  })

  it('lists every printing without a notice when there are 25 or fewer', () => {
    states.search = { data: [makeCard()], isPending: false, isError: false }
    states.printings = {
      data: Array.from({ length: 25 }, (_, i) =>
        makePrinting({ id: `p${i}`, collectorNumber: String(i + 1) })
      ),
      isPending: false,
      isError: false,
    }
    renderAddCard()
    typeQuery('bolt')
    fireEvent.click(screen.getByRole('button', { name: 'Lightning Bolt' }))

    expect(screen.queryByRole('option', { name: /Mostrando \d+ de \d+ ediciones/ })).not.toBeInTheDocument()
    const select = screen.getByRole('combobox')
    expect(Array.from(select.querySelectorAll('option')).filter((o) => o.value !== '')).toHaveLength(25)
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
    fireEvent.change(screen.getByRole('combobox', { name: 'Impresión' }), {
      target: { value: 'printing-1' },
    })
  }

  it('offers a finish select when the printing has several finishes', () => {
    selectPrinting(['nonfoil', 'foil'])

    const finishSelect = screen.getByRole('combobox', { name: 'Acabado' })
    expect(finishSelect).toHaveValue('nonfoil')
    fireEvent.change(finishSelect, { target: { value: 'foil' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(addEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({ printingId: 'printing-1', finish: 'foil' }),
    )
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
