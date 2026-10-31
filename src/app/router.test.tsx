import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'
import { createAppRouter } from '@/app/router'
import { authPort } from '@/shared/api/authPort'

// Only the binding is replaced: AppLayout bootstraps the session on mount,
// and a pending promise keeps the store out of the render path (no act() noise).
vi.mock('@/shared/api/authPort', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/authPort')>()
  return {
    ...actual,
    authPort: {
      available: false,
      session: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
    },
  }
})

const mockedPort = vi.mocked(authPort)

// A route whose component fails at render — the failure class the root
// errorElement exists for (lazy chunks failing mid-deploy render as errors).
vi.mock('@/features/auth/components/LoginPage', () => ({
  default: () => {
    throw new Error('Simulated route failure')
  },
}))

function renderRoute(hash: string) {
  window.location.hash = hash
  return render(<RouterProvider router={createAppRouter()} />)
}

describe('app router fallbacks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedPort.session.mockReturnValue(new Promise(() => {}))
  })

  it('renders a friendly page for an unmatched hash route', async () => {
    renderRoute('#/ruta-que-no-existe')

    expect(
      await screen.findByRole('heading', { name: 'Página no encontrada' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al binder' })).toHaveAttribute(
      'href',
      '#/',
    )
    // The layout still renders around it: the user keeps their navigation.
    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
  })

  it('renders the error page when a route fails instead of the raw boundary', async () => {
    renderRoute('#/login')

    expect(
      await screen.findByRole('heading', { name: 'Algo salió mal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al binder' })).toHaveAttribute(
      'href',
      '#/',
    )
  })
})
