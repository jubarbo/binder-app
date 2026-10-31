import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ApiError } from '@/shared/api/apiClient'
import LoginPage from '@/features/auth/components/LoginPage'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import { authPort, AuthUnavailableError, type User } from '@/shared/api/authPort'

// Only the binding is replaced; AuthUnavailableError stays the real class so
// the component's instanceof check behaves as it does in the app.
vi.mock('@/shared/api/authPort', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/authPort')>()
  return {
    ...actual,
    authPort: {
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

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<div>register-probe</div>} />
        <Route path="/" element={<div>binder-probe</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillCredentials() {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'ana@example.com' },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: 'secret' },
  })
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useSessionStore.setState({ user: null, loading: true })
  })

  it('logs in through the port, stores the session and lands on the binder', async () => {
    mockedPort.login.mockResolvedValueOnce(ana)
    renderLogin()
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('binder-probe')).toBeInTheDocument()
    expect(mockedPort.login).toHaveBeenCalledWith('ana@example.com', 'secret')
    expect(useSessionStore.getState().user).toEqual(ana)
  })

  it('shows an honest message when there is no backend, leaving the session clean', async () => {
    mockedPort.login.mockRejectedValueOnce(new AuthUnavailableError())
    renderLogin()
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no está conectado/i,
    )
    expect(useSessionStore.getState().user).toBeNull()
    expect(screen.queryByText('binder-probe')).not.toBeInTheDocument()
  })

  it('says the credentials are wrong when the API answers 401', async () => {
    mockedPort.login.mockRejectedValueOnce(new ApiError('Invalid email or password', { status: 401 }))
    renderLogin()
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.')
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('keeps the port untouched while the form is invalid', async () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Ingresa tu correo')).toBeInTheDocument()
    expect(mockedPort.login).not.toHaveBeenCalled()
  })

  it('links to the register screen', async () => {
    renderLogin()
    fireEvent.click(screen.getByRole('link', { name: 'Crea una cuenta' }))

    expect(await screen.findByText('register-probe')).toBeInTheDocument()
  })
})
