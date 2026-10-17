import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { toast } from 'react-toastify'
import { AppLayout } from '@/app/layout'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import { authPort, type User } from '@/shared/api/authPort'
import { useLocaleStore } from '@/shared/locale/localeStore'

vi.mock('@/features/binder/components/CardFlightOverlay', () => ({
  default: () => null,
}))

// Only the binding is replaced: AppLayout bootstraps the session on mount,
// and the session-bootstrap test below needs to observe that call. The
// CardFlightOverlay mock above keeps the layout focused, as before.
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

describe('AppLayout session bootstrap', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('bootstraps the session once on mount', () => {
    // Deliberately never settles: the assertion targets the trigger itself,
    // and a settled bootstrap would update the store outside act() for no
    // benefit in this test.
    mockedPort.session.mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    )

    expect(mockedPort.session).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
  })
})

describe('AppLayout user menu', () => {
  const ana: User = { id: 'u1', email: 'ana@example.com', displayName: 'Ana' }

  beforeEach(() => {
    vi.resetAllMocks()
    // Pending session keeps the bootstrap from overwriting the seeded state.
    mockedPort.session.mockReturnValue(new Promise(() => {}))
    useSessionStore.setState({ user: ana, loading: false })
  })

  function renderWithRoutes() {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div>binder-probe</div>} />
            <Route path="/profile" element={<div>profile-probe</div>} />
            <Route path="/login" element={<div>login-probe</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
  }

  function openMenu() {
    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
  }

  it('sends "Mi cuenta" to the profile when there is a session', () => {
    renderWithRoutes()
    openMenu()

    fireEvent.click(screen.getByRole('menuitem', { name: 'Mi cuenta' }))

    expect(screen.getByText('profile-probe')).toBeInTheDocument()
  })

  it('signs out through the port and clears the session', () => {
    renderWithRoutes()
    openMenu()

    fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))

    expect(mockedPort.logout).toHaveBeenCalledTimes(1)
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('reports a failed server logout after clearing the local session', async () => {
    mockedPort.logout.mockRejectedValueOnce(new Error('server down'))
    renderWithRoutes()
    openMenu()

    fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))

    expect(
      await screen.findByText('No se pudo cerrar la sesión en el servidor.'),
    ).toBeInTheDocument()
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('offers sign-in instead of account items when signed out', () => {
    useSessionStore.setState({ user: null })
    renderWithRoutes()
    openMenu()

    expect(screen.queryByText('Mi cuenta')).not.toBeInTheDocument()
    expect(screen.queryByText('Cerrar sesión')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('menuitem', { name: 'Iniciar sesión' }))
    expect(screen.getByText('login-probe')).toBeInTheDocument()
  })
})
