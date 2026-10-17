import { describe, it, expect, vi, beforeEach } from 'vitest'
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
