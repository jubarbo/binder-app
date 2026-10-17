import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSessionStore } from '@/features/auth/state/sessionStore'
import { authPort, type User } from '@/shared/api/authPort'

vi.mock('@/shared/api/authPort', () => ({
  authPort: {
    session: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
  },
}))

const mockedPort = vi.mocked(authPort)

const ana: User = {
  id: 'u-1',
  email: 'ana@example.com',
  displayName: 'Ana',
}

describe('sessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the singleton between tests: not bootstrapped yet, no user.
    useSessionStore.setState({ user: null, loading: true })
  })

  it('starts without a user and marks itself as loading', () => {
    const { user, loading } = useSessionStore.getState()
    expect(user).toBeNull()
    expect(loading).toBe(true)
  })

  it('bootstrap loads the session from the auth port', async () => {
    mockedPort.session.mockResolvedValueOnce(ana)

    await useSessionStore.getState().bootstrap()

    expect(mockedPort.session).toHaveBeenCalledTimes(1)
    const { user, loading } = useSessionStore.getState()
    expect(user).toEqual(ana)
    expect(loading).toBe(false)
  })

  it('bootstrap settles with no user when the port reports no session', async () => {
    mockedPort.session.mockResolvedValueOnce(null)

    await useSessionStore.getState().bootstrap()

    const { user, loading } = useSessionStore.getState()
    expect(user).toBeNull()
    expect(loading).toBe(false)
  })

  it('signIn stores the user returned by a successful login', () => {
    useSessionStore.getState().signIn(ana)

    const { user, loading } = useSessionStore.getState()
    expect(user).toEqual(ana)
    expect(loading).toBe(false)
  })

  it('signOut logs out through the port and clears the user', async () => {
    useSessionStore.setState({ user: ana, loading: false })
    mockedPort.logout.mockResolvedValueOnce(undefined)

    await useSessionStore.getState().signOut()

    expect(mockedPort.logout).toHaveBeenCalledTimes(1)
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('signOut clears the user even if the port rejects', async () => {
    useSessionStore.setState({ user: ana, loading: false })
    mockedPort.logout.mockRejectedValueOnce(new Error('network'))

    await expect(useSessionStore.getState().signOut()).rejects.toThrow('network')
    expect(useSessionStore.getState().user).toBeNull()
  })
})
