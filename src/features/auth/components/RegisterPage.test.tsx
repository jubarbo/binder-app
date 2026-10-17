import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RegisterPage from '@/features/auth/components/RegisterPage'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import { authPort, AuthUnavailableError, type User } from '@/shared/api/authPort'

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

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>login-probe</div>} />
        <Route path="/" element={<div>binder-probe</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillForm() {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'ana@example.com' },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: 'secret' },
  })
  fireEvent.change(screen.getByLabelText('Nombre para mostrar'), {
    target: { value: 'Ana' },
  })
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useSessionStore.setState({ user: null, loading: true })
  })

  it('registers through the port, stores the session and lands on the binder', async () => {
    mockedPort.register.mockResolvedValueOnce(ana)
    renderRegister()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('binder-probe')).toBeInTheDocument()
    expect(mockedPort.register).toHaveBeenCalledWith(
      'ana@example.com',
      'secret',
      'Ana',
    )
    expect(useSessionStore.getState().user).toEqual(ana)
  })

  it('shows an honest message when there is no backend, leaving the session clean', async () => {
    mockedPort.register.mockRejectedValueOnce(new AuthUnavailableError())
    renderRegister()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no está conectado/i,
    )
    expect(useSessionStore.getState().user).toBeNull()
    expect(screen.queryByText('binder-probe')).not.toBeInTheDocument()
  })

  it('links back to the login screen', async () => {
    renderRegister()
    fireEvent.click(screen.getByRole('link', { name: 'Inicia sesión' }))

    expect(await screen.findByText('login-probe')).toBeInTheDocument()
  })
})
