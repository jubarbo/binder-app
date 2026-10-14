import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'react-toastify'
import { AppLayout } from '@/app/layout'

vi.mock('@/features/binder/components/CardFlightOverlay', () => ({
  default: () => null,
}))

describe('AppLayout notifications', () => {
  it('renders toasts with a theme class the stylesheet actually paints', async () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    )

    toast.success('Carta eliminada')

    // v11 has no "auto" theme: the type accepts any string, an unknown value
    // adds no theme class, and the toast then renders with no background at
    // all. Pin it to one of the variants react-toastify actually styles.
    const text = await screen.findByText('Carta eliminada')
    expect(text.closest('.Toastify__toast')?.className).toMatch(
      /Toastify__toast-theme--(light|dark|colored)\b/,
    )
  })
})
