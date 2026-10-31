import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  localAuthPort,
  AuthUnavailableError,
  type User,
} from '@/shared/api/authPort'

describe('localAuthPort', () => {
  it('reports no session — with no backend there is nobody', async () => {
    expect(await localAuthPort.session()).toBeNull()
  })

  it('refuses to log in, since there is no backend to authenticate against', async () => {
    await expect(localAuthPort.login('a@b.c', 'pw')).rejects.toThrow(
      AuthUnavailableError,
    )
  })

  it('refuses to register', async () => {
    await expect(localAuthPort.register('a@b.c', 'pw', 'A')).rejects.toThrow(
      AuthUnavailableError,
    )
  })

  it('treats logout as a no-op', async () => {
    await expect(localAuthPort.logout()).resolves.toBeUndefined()
  })

  it('advertises that no auth system backs it', () => {
    expect(localAuthPort.available).toBe(false)
  })

  it('refuses to update a profile', async () => {
    await expect(localAuthPort.updateProfile({ displayName: 'X' })).rejects.toThrow(
      AuthUnavailableError,
    )
  })
})

// The mock is selected only behind DEV + VITE_MOCK_AUTH=1, so it is imported
// directly here to exercise its coherent flow without depending on the binding.
describe('mockAuthPort (direct)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('logs in, exposes the session, and logs out', async () => {
    const { mockAuthPort } = await import('@/shared/api/authPort')
    const user = await mockAuthPort.login('ana@example.com', 'pw')
    expect(user.email).toBe('ana@example.com')
    const session = await mockAuthPort.session()
    expect(session?.id).toBe(user.id)
    await mockAuthPort.logout()
    expect(await mockAuthPort.session()).toBeNull()
  })

  it('updates the profile and reflects it in the session', async () => {
    const { mockAuthPort } = await import('@/shared/api/authPort')
    const created = await mockAuthPort.register('ana@example.com', 'pw', 'Ana')
    const updated = await mockAuthPort.updateProfile({ displayName: 'Ana G.' })
    expect(updated.id).toBe(created.id)
    expect(updated.displayName).toBe('Ana G.')
    const session = await mockAuthPort.session()
    expect(session?.displayName).toBe('Ana G.')
  })

  it('advertises that an auth system backs it', async () => {
    const { mockAuthPort } = await import('@/shared/api/authPort')
    expect(mockAuthPort.available).toBe(true)
  })
})

describe('User type', () => {
  it('carries the identity shape the app needs', () => {
    const user: User = {
      id: 'u1',
      email: 'ana@example.com',
      displayName: 'Ana',
    }
    expect(user.avatarUrl).toBeUndefined()
  })
})

describe('apiAuthPort', () => {
  const fetchMock = vi.fn()
  const user: User = { id: 'u1', email: 'a@b.c', displayName: 'Ana' }
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is backed by a real auth system', async () => {
    const { apiAuthPort } = await import('@/shared/api/authPort')
    expect(apiAuthPort.available).toBe(true)
  })

  it('reads the session from GET /users/me', async () => {
    const { apiAuthPort } = await import('@/shared/api/authPort')
    fetchMock.mockResolvedValue(json(200, user))
    expect(await apiAuthPort.session()).toEqual(user)
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/users\/me$/)
  })

  it('treats 401 on /users/me as signed out', async () => {
    const { apiAuthPort } = await import('@/shared/api/authPort')
    fetchMock.mockResolvedValue(json(401, { error: { message: 'Not signed in', code: 'unauthorized', status: 401 } }))
    expect(await apiAuthPort.session()).toBeNull()
  })

  it('logs in and registers with the documented bodies', async () => {
    const { apiAuthPort } = await import('@/shared/api/authPort')
    fetchMock.mockImplementation(async () => json(200, user))
    await apiAuthPort.login('a@b.c', 'secret')
    await apiAuthPort.register('a@b.c', 'secret', 'Ana')
    const [loginUrl, loginInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    const [registerUrl, registerInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(loginUrl).toMatch(/\/auth\/login$/)
    expect(JSON.parse(String(loginInit.body))).toEqual({ email: 'a@b.c', password: 'secret' })
    expect(registerUrl).toMatch(/\/auth\/register$/)
    expect(JSON.parse(String(registerInit.body))).toEqual({ email: 'a@b.c', password: 'secret', displayName: 'Ana' })
  })

  it('rejects bad credentials with the API status', async () => {
    const { apiAuthPort } = await import('@/shared/api/authPort')
    fetchMock.mockResolvedValue(json(401, { error: { message: 'Invalid email or password', code: 'unauthorized', status: 401 } }))
    await expect(apiAuthPort.login('a@b.c', 'bad')).rejects.toMatchObject({ status: 401 })
  })

  it('logs out with POST /auth/logout and patches the profile with PATCH /users/me', async () => {
    const { apiAuthPort } = await import('@/shared/api/authPort')
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    fetchMock.mockResolvedValueOnce(json(200, { ...user, displayName: 'Bea' }))
    await expect(apiAuthPort.logout()).resolves.toBeUndefined()
    expect(await apiAuthPort.updateProfile({ displayName: 'Bea' })).toMatchObject({ displayName: 'Bea' })
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].method).toBe('POST')
    expect((fetchMock.mock.calls[1] as [string, RequestInit])[1].method).toBe('PATCH')
  })
})

describe('authPort binding', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('uses the API adapter when VITE_API_URL is set', async () => {
    vi.stubEnv('VITE_MOCK_AUTH', '')
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api/v1')
    vi.resetModules()
    const mod = await import('@/shared/api/authPort')
    expect(mod.authPort).toBe(mod.apiAuthPort)
  })

  it('keeps the honest local port without VITE_API_URL', async () => {
    vi.stubEnv('VITE_MOCK_AUTH', '')
    vi.stubEnv('VITE_API_URL', '')
    vi.resetModules()
    const mod = await import('@/shared/api/authPort')
    expect(mod.authPort).toBe(mod.localAuthPort)
  })
})
