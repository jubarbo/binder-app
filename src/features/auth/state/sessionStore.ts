import { create } from 'zustand'
import { authPort, type User } from '@/shared/api/authPort'

/**
 * Session state: who am I. Deliberately NOT persisted — the source of truth
 * is the auth port (a httpOnly cookie on the backend, `null` locally), so the
 * store bootstraps from `authPort.session()` on every load instead of trusting
 * a stale localStorage copy.
 */
interface SessionState {
  /** The signed-in user, or `null`. */
  user: User | null
  /** True until the initial `bootstrap()` settles. */
  loading: boolean
  /** Load the current session once on app start. */
  bootstrap: () => Promise<void>
  /** Store the user after a successful login or register. */
  signIn: (user: User) => void
  /**
   * End the session: clears the local user first (the user asked to sign out;
   * a failing port call never traps them in a signed-in UI), then delegates to
   * the port, whose failure still propagates so the caller can surface it.
   */
  signOut: () => Promise<void>
}

/** Client-side session store, bootstrapped from the `AuthPort` binding. */
export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  loading: true,

  bootstrap: async () => {
    const user = await authPort.session()
    set({ user, loading: false })
  },

  signIn: (user) => {
    set({ user, loading: false })
  },

  signOut: async () => {
    set({ user: null })
    await authPort.logout()
  },
}))
