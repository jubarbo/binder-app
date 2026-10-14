import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CardSearch from '@/shared/components/CardSearch'
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
}))

vi.mock('@/features/catalog/catalogQueries', () => ({
  useSearchCards: () => states.search,
}))

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

/** Owns the controlled query so the input behaves like inside a real form. */
function Harness(props: {
  onSelect?: (card: OracleCard) => void
  onEnter?: () => void
  excludeOracleIds?: ReadonlySet<string>
  hideSuggestions?: boolean
}) {
  const [query, setQuery] = useState('')
  return (
    <CardSearch
      query={query}
      onQueryChange={setQuery}
      onSelect={props.onSelect ?? (() => {})}
      onEnter={props.onEnter}
      excludeOracleIds={props.excludeOracleIds}
      hideSuggestions={props.hideSuggestions}
    />
  )
}

function typeQuery(value: string) {
  fireEvent.change(screen.getByPlaceholderText('Buscar carta...'), {
    target: { value },
  })
}

beforeEach(() => {
  states.search = { data: null, isPending: false, isError: false }
})

describe('CardSearch', () => {
  it('renders a suggestion per result and calls onSelect on pick', () => {
    states.search = { data: [makeCard()], isPending: false, isError: false }
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    typeQuery('bolt')
    const suggestion = screen.getByRole('button', { name: 'Lightning Bolt' })
    expect(suggestion).toBeInTheDocument()

    fireEvent.click(suggestion)
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ oracleId: 'oracle-bolt' }),
    )
  })

  it('hides suggestions whose oracle id is excluded', () => {
    states.search = {
      data: [
        makeCard(),
        makeCard({ oracleId: 'oracle-ancestral', name: 'Ancestral Recall' }),
      ],
      isPending: false,
      isError: false,
    }
    render(<Harness excludeOracleIds={new Set(['oracle-bolt'])} />)

    typeQuery('bol')
    expect(
      screen.queryByRole('button', { name: 'Lightning Bolt' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ancestral Recall' }),
    ).toBeInTheDocument()
  })

  it('hides the suggestion list when hideSuggestions is set', () => {
    states.search = { data: [makeCard()], isPending: false, isError: false }
    render(<Harness hideSuggestions />)

    typeQuery('bolt')
    expect(
      screen.queryByRole('button', { name: 'Lightning Bolt' }),
    ).not.toBeInTheDocument()
  })

  it('shows a three-dot loader while the search is pending', () => {
    states.search = { data: null, isPending: true, isError: false }
    render(<Harness />)

    typeQuery('light')
    const loader = screen.getByRole('status', { name: 'Buscando…' })
    expect(loader.querySelectorAll('.card-search-loader-dot')).toHaveLength(3)
    expect(screen.queryByText('Buscando…')).not.toBeInTheDocument()
  })

  it('shows an error alert when the search fails', () => {
    states.search = { data: null, isPending: false, isError: true }
    render(<Harness />)

    typeQuery('bolt')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo buscar. Intenta de nuevo.',
    )
  })

  it('shows an empty state when the search returns no results', () => {
    states.search = { data: [], isPending: false, isError: false }
    render(<Harness />)

    typeQuery('zzz')
    expect(screen.getByText('Sin resultados para tu búsqueda.')).toBeInTheDocument()
  })

  it('calls onEnter when Enter is pressed in the input', () => {
    const onEnter = vi.fn()
    render(<Harness onEnter={onEnter} />)

    fireEvent.keyDown(screen.getByPlaceholderText('Buscar carta...'), {
      key: 'Enter',
    })
    expect(onEnter).toHaveBeenCalledTimes(1)
  })

  it('shows nothing while the query is empty, even if the query reports pending', () => {
    states.search = { data: null, isPending: true, isError: false }
    render(<Harness />)

    expect(screen.queryByRole('status', { name: 'Buscando…' })).not.toBeInTheDocument()
  })
})
