import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'react-toastify'
import { AppLayout } from '@/app/layout'
import { useLocaleStore } from '@/shared/locale/localeStore'

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

describe('AppLayout locale switch', () => {
  it('shows the active locale and cycles to the next one', () => {
    useLocaleStore.getState().setLocale('es')

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    )

    // Spanish is active: the control reads "ES" and offers the switch to English.
    const button = screen.getByRole('button', { name: 'Cambiar idioma a English' })
    expect(button).toHaveTextContent('ES')

    fireEvent.click(button)

    const toggled = screen.getByRole('button', { name: 'Cambiar idioma a Español' })
    expect(toggled).toHaveTextContent('EN')
    expect(useLocaleStore.getState().locale).toBe('en')
  })
})
