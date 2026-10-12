import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AddCard from '@/features/binder/components/AddCard'

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
