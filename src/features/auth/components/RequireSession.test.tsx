import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RequireSession from '@/features/auth/components/RequireSession'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import { authPort, type User } from '@/shared/api/authPort'

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

const ana: User = { id: 'u1', email: 'ana@example.com', displayName: 'Ana' }

function renderGuard(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RequireSession />}>
          <Route path="/" element={<div>binder-probe</div>} />
          <Route path="/wants" element={<div>wants-probe</div>} />
        </Route>
        <Route path="/login" element={<div>login-probe</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireSession', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedPort.available = true
    useSessionStore.setState({ user: null, loading: false })
  })

  it('redirects to login when auth is available and there is no session', () => {
    renderGuard()

    expect(screen.getByText('login-probe')).toBeInTheDocument()
    expect(screen.queryByText('binder-probe')).not.toBeInTheDocument()
  })

  it('guards the wants route too', () => {
    renderGuard('/wants')

    expect(screen.getByText('login-probe')).toBeInTheDocument()
    expect(screen.queryByText('wants-probe')).not.toBeInTheDocument()
  })

  it('lets a signed-in user through when auth is available', () => {
    useSessionStore.setState({ user: ana, loading: false })

    renderGuard()

    expect(screen.getByText('binder-probe')).toBeInTheDocument()
  })

  it('keeps routes open when no auth system backs the app (local-only)', () => {
    mockedPort.available = false

    renderGuard()

    expect(screen.getByText('binder-probe')).toBeInTheDocument()
  })

  it('holds the current view while the session bootstraps', () => {
    useSessionStore.setState({ user: null, loading: true })

    renderGuard()

    expect(screen.getByText('Cargando…')).toBeInTheDocument()
    expect(screen.queryByText('login-probe')).not.toBeInTheDocument()
    expect(screen.queryByText('binder-probe')).not.toBeInTheDocument()
  })
})
