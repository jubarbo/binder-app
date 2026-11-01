import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ApiError } from '@/shared/api/apiClient'
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

function fillForm({ password = 'secret12', displayName = 'Ana' } = {}) {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'ana@example.com' },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: password },
  })
  fireEvent.change(screen.getByLabelText('Nombre para mostrar'), {
    target: { value: displayName },
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
      'secret12',
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

  it('says the email is taken when the API answers 409', async () => {
    mockedPort.register.mockRejectedValueOnce(new ApiError('Email already registered', { status: 409 }))
    renderRegister()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta con ese email.')
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('requires at least 8 password characters before calling the API', async () => {
    renderRegister()
    fillForm({ password: 'secret1' })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres'),
    ).toBeInTheDocument()
    expect(mockedPort.register).not.toHaveBeenCalled()
  })

  it('caps the display name at 60 characters before calling the API', async () => {
    renderRegister()
    fillForm({ displayName: 'a'.repeat(61) })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(
      await screen.findByText('El nombre puede tener hasta 60 caracteres'),
    ).toBeInTheDocument()
    expect(mockedPort.register).not.toHaveBeenCalled()
  })

  it('explains what to fix when the API rejects the data with 400', async () => {
    mockedPort.register.mockRejectedValueOnce(
      new ApiError('Password must be at least 8 characters', { status: 400 }),
    )
    renderRegister()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Revisa los datos: la contraseña necesita al menos 8 caracteres y el nombre hasta 60.',
    )
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('says the server is unreachable when the request never got an answer', async () => {
    mockedPort.register.mockRejectedValueOnce(
      new ApiError('Could not reach the server. Check your network connection.'),
    )
    renderRegister()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor. Revisa tu conexión.',
    )
  })

  it('links back to the login screen', async () => {
    renderRegister()
    fireEvent.click(screen.getByRole('link', { name: 'Inicia sesión' }))

    expect(await screen.findByText('login-probe')).toBeInTheDocument()
  })
})
