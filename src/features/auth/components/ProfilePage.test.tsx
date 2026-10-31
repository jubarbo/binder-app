import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProfilePage from '@/features/auth/components/ProfilePage'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import { authPort, AuthUnavailableError, type User } from '@/shared/api/authPort'

// Only the binding is replaced; AuthUnavailableError stays the real class so
// the component's instanceof check behaves as it does in the app.
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

const ana: User = {
  id: 'u1',
  email: 'ana@example.com',
  displayName: 'Ana',
  avatarUrl: 'https://example.com/old.png',
}

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<div>login-probe</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillForm(displayName: string, avatarUrl: string) {
  fireEvent.change(screen.getByLabelText('Nombre para mostrar'), {
    target: { value: displayName },
  })
  fireEvent.change(screen.getByLabelText('URL del avatar'), {
    target: { value: avatarUrl },
  })
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useSessionStore.setState({ user: ana, loading: false })
  })

  it('prefills the form from the session user and locks the email', () => {
    renderProfile()

    expect(screen.getByLabelText('Nombre para mostrar')).toHaveValue('Ana')
    expect(screen.getByLabelText('URL del avatar')).toHaveValue(
      'https://example.com/old.png',
    )
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue(
      'ana@example.com',
    )
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute(
      'readonly',
    )
  })

  it('saves through the port, updates the session and confirms', async () => {
    const saved: User = {
      ...ana,
      displayName: 'Ana G.',
      avatarUrl: 'https://example.com/new.png',
    }
    mockedPort.updateProfile.mockResolvedValueOnce(saved)
    renderProfile()
    fillForm('Ana G.', 'https://example.com/new.png')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Perfil actualizado')).toBeInTheDocument()
    expect(mockedPort.updateProfile).toHaveBeenCalledWith({
      displayName: 'Ana G.',
      avatarUrl: 'https://example.com/new.png',
    })
    expect(useSessionStore.getState().user).toEqual(saved)
  })

  it('clears the avatar when the URL is left empty', async () => {
    const saved: User = { ...ana }
    delete saved.avatarUrl
    mockedPort.updateProfile.mockResolvedValueOnce(saved)
    renderProfile()
    fillForm('Ana', '')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Perfil actualizado')).toBeInTheDocument()
    expect(mockedPort.updateProfile).toHaveBeenCalledWith({
      displayName: 'Ana',
      avatarUrl: undefined,
    })
  })

  it('shows an honest message when there is no backend, keeping the session', async () => {
    mockedPort.updateProfile.mockRejectedValueOnce(new AuthUnavailableError())
    renderProfile()
    fillForm('Ana G.', '')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no está conectado/i,
    )
    expect(useSessionStore.getState().user).toEqual(ana)
  })

  it('keeps the port untouched while the avatar URL is invalid', async () => {
    renderProfile()
    fillForm('Ana G.', 'not-a-url')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Ingresa una URL válida')).toBeInTheDocument()
    expect(mockedPort.updateProfile).not.toHaveBeenCalled()
  })

  it('offers a sign-in path instead of a form when there is no session', () => {
    useSessionStore.setState({ user: null })

    renderProfile()

    expect(
      screen.getByText('No hay una sesión activa en este navegador.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre para mostrar')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Inicia sesión' }))
    expect(screen.getByText('login-probe')).toBeInTheDocument()
  })
})
