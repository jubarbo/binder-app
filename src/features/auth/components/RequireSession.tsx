import { Navigate, Outlet } from 'react-router-dom'
import { authPort } from '@/shared/api/authPort'
import { useSessionStore } from '@/features/auth/state/sessionStore'

/**
 * Route guard for the binder routes. It enforces a session only when an auth
 * system backs the app (`authPort.available`): a local-only install has no
 * session to require, and the local-first experience must not brick. While the
 * store is still bootstrapping it holds the current view instead of guessing —
 * redirecting on an unresolved session would bounce a signed-in user to
 * /login on every load.
 */
export default function RequireSession() {
  const user = useSessionStore((state) => state.user)
  const loading = useSessionStore((state) => state.loading)

  if (loading) {
    return (
      <div className="route-fallback" aria-busy="true">
        Cargando…
      </div>
    )
  }

  if (authPort.available && user === null) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
