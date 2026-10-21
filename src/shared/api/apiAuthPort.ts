import { ApiError, apiRequest } from '@/shared/api/apiClient'
import type { AuthPort, User } from '@/shared/api/authPort'

/**
 * `AuthPort` backed by binder-api. The session is an httpOnly cookie set by
 * register/login and cleared by logout; the app learns "who am I" from
 * `GET /users/me`, where a 401 simply means signed out.
 */
export const apiAuthPort: AuthPort = {
  available: true,

  async session(signal) {
    try {
      return await apiRequest<User>('/users/me', { signal })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },

  login: (email, password, signal) =>
    apiRequest<User>('/auth/login', { method: 'POST', body: { email, password }, signal }),

  register: (email, password, displayName, signal) =>
    apiRequest<User>('/auth/register', {
      method: 'POST',
      body: { email, password, displayName },
      signal,
    }),

  async logout(signal) {
    await apiRequest<void>('/auth/logout', { method: 'POST', signal })
  },

  updateProfile: (patch, signal) =>
    apiRequest<User>('/users/me', { method: 'PATCH', body: patch, signal }),
}
