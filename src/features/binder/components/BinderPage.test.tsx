import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BinderPage from './BinderPage'

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
})
