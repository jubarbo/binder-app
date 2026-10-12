import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BinderPage from '@/features/binder/components/BinderPage'

vi.mock('@/features/binder/state/binderStore', () => ({
  useBinderStore: vi.fn((selector: any) => {
    const state = { entries: [] }
    return selector(state)
  }),
}))

describe('BinderPage', () => {
  it('renders binder page', () => {
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <BinderPage />
      </QueryClientProvider>
    )
    expect(screen.getAllByText(/Binder/i).length).toBeGreaterThan(0)
  })

  it('opens the add-card dialog from the empty state', () => {
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <BinderPage />
      </QueryClientProvider>
    )
    expect(screen.queryByRole('heading', { name: /Agregar carta/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Agregar carta/i }))
    expect(screen.getByRole('heading', { name: /Agregar carta/i })).toBeTruthy()
  })
})
