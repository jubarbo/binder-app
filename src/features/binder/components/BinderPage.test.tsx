import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import BinderPage from '@/features/binder/components/BinderPage'
import type { BinderEntry } from '@/shared/types/mtg'

const store = vi.hoisted(() => ({
  entries: [] as BinderEntry[],
}))

vi.mock('@/features/binder/state/binderStore', () => ({
  useBinderStore: (selector: (state: { entries: BinderEntry[] }) => unknown) =>
    selector({ entries: store.entries }),
}))

function makeEntry(overrides: Partial<BinderEntry> = {}): BinderEntry {
  return {
    id: 'e1',
    printingId: 'p1',
    quantity: 1,
    condition: 'NM',
    language: 'en',
    forTrade: true,
    ...overrides,
  }
}

function renderPage() {
  const client = new QueryClient()
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <BinderPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  store.entries = []
})

describe('BinderPage', () => {
  it('renders binder page', () => {
    renderPage()
    expect(screen.getAllByText(/Binder/i).length).toBeGreaterThan(0)
  })

  it('opens the add-card dialog from the empty state', () => {
    renderPage()
    expect(screen.queryByRole('heading', { name: /Agregar carta/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Agregar carta/i }))
    expect(screen.getByRole('heading', { name: /Agregar carta/i })).toBeTruthy()
  })

  it('shows the add-card button and opens the dialog when the binder has entries', () => {
    store.entries = [makeEntry()]
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Agregar carta/i }))
    expect(screen.getByRole('heading', { name: /Agregar carta/i })).toBeTruthy()
  })
})

describe('BinderPage add shortcut', () => {
  it('opens the add-card dialog from the first empty pocket', () => {
    store.entries = [makeEntry()]
    renderPage()

    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar una carta en este espacio' }),
    )

    expect(screen.getByRole('heading', { name: /Agregar carta/i })).toBeInTheDocument()
  })

  it('offers the pocket button on the first empty slot only', () => {
    store.entries = [makeEntry()]
    const { container } = renderPage()

    expect(
      screen.getAllByRole('button', { name: 'Agregar una carta en este espacio' }),
    ).toHaveLength(1)
    // The page keeps its 5x3 shape: one interactive pocket plus 14 spacers.
    expect(container.querySelectorAll('.binder-slot--empty')).toHaveLength(14)
  })

  it('shows no pocket button on a page without empty slots', () => {
    store.entries = Array.from({ length: 15 }, (_, i) =>
      makeEntry({ id: `e${i}`, printingId: `p${i}` }),
    )
    renderPage()

    expect(
      screen.queryByRole('button', { name: 'Agregar una carta en este espacio' }),
    ).not.toBeInTheDocument()
  })
})
