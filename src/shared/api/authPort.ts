/**
 * The authenticated user's identity. Everything else in the app keys off this:
 * a binder entry belongs to a `User`, and matching resolves other users by it.
 * `avatarUrl` is optional — many users will not set one.
 */
export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
}

/**
 * Thrown by the local (no-backend) port when an action genuinely cannot happen
 * without a server: logging in, registering, or editing a profile. The UI
 * catches this to show an honest "not connected" state instead of inventing a
 * session that would evaporate on reload.
 */
export class AuthUnavailableError extends Error {
  constructor() {
    super('auth_unavailable')
    this.name = 'AuthUnavailableError'
  }
}

/**
 * Port for "who am I" — the identity seam. A future backend satisfies this
 * contract (httpOnly-cookie session, `GET /users/me`) without touching
 * consumers; consumers go through the `authPort` binding only.
 */
export interface AuthPort {
  /**
   * Whether an auth system actually backs this port (`false` for the honest
   * local port, `true` for the mock and any future API adapter). The route
   * guard asks this before enforcing a session, so a local-only install keeps
   * every route open — there is no session to require without a backend.
   */
  available: boolean
  /** The current session, or `null` when signed out. */
  session(signal?: AbortSignal): Promise<User | null>
  login(email: string, password: string, signal?: AbortSignal): Promise<User>
  register(
    email: string,
    password: string,
    displayName: string,
    signal?: AbortSignal,
  ): Promise<User>
  /** Clears the session. Resolves as a no-op when already signed out. */
  logout(signal?: AbortSignal): Promise<void>
  /** Patches the current user's profile and returns the updated user. */
  updateProfile(
    patch: { displayName?: string; avatarUrl?: string },
    signal?: AbortSignal,
  ): Promise<User>
}

/**
 * Local implementation: with no backend there is no session and no way to
 * authenticate. Reads honestly report `null`; actions refuse rather than
 * fabricate a user, so a reload never appears to "lose" a fake login.
 */
export const localAuthPort: AuthPort = {
  available: false,
  session: async () => null,
  login: async () => {
    throw new AuthUnavailableError()
  },
  register: async () => {
    throw new AuthUnavailableError()
  },
  logout: async () => {},
  updateProfile: async () => {
    throw new AuthUnavailableError()
  },
}

/**
 * Dev-only mock so the identity flow can be previewed before the API exists.
 * Selected only in dev and only when VITE_MOCK_AUTH=1. A module-level user
 * makes login/session/logout/updateProfile behave as one coherent flow: login
 * or register sets the user, session reads it, logout clears it, and
 * updateProfile patches it. Never ships to production (the binding resolves to
 * the honest local port regardless of the flag there).
 */
export const mockAuthPort: AuthPort = (() => {
  let current: User | null = null
  let nextId = 0
  return {
    available: true,
    session: async () => current,
    login: async (email) => {
      current = {
        id: `mock-${(nextId += 1)}`,
        email,
        displayName: email.split('@')[0] ?? email,
      }
      return current
    },
    register: async (email, _password, displayName) => {
      current = { id: `mock-${(nextId += 1)}`, email, displayName }
      return current
    },
    logout: async () => {
      current = null
    },
    updateProfile: async (patch) => {
      if (!current) throw new AuthUnavailableError()
      current = { ...current, ...patch }
      return current
    },
  }
})()

/**
 * Active auth adapter. Consumers go through this binding only. The mock is
 * gated behind both DEV and an explicit opt-in flag: a production build always
 * resolves to the honest local port regardless of the flag.
 */
export const authPort: AuthPort =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH === '1'
    ? mockAuthPort
    : localAuthPort
