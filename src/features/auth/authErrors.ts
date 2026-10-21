import { ApiError } from '@/shared/api/apiClient'
import { AuthUnavailableError } from '@/shared/api/authPort'

type AuthAction = 'login' | 'register'

/**
 * User-facing message for a failed login/register. Distinguishes the cases the
 * API reports (bad credentials, taken email, too many attempts, unreachable
 * server) instead of one generic failure, and keeps the honest "no backend"
 * message for the local port.
 */
export function authErrorMessage(error: unknown, action: AuthAction): string {
  if (error instanceof AuthUnavailableError) {
    return action === 'login'
      ? 'El backend no está conectado todavía: no se puede iniciar sesión sin servidor.'
      : 'El backend no está conectado todavía: no se puede crear una cuenta sin servidor.'
  }
  if (error instanceof ApiError) {
    if (error.status === 0) return 'No se pudo conectar con el servidor. Revisa tu conexión.'
    if (error.status === 429) return 'Demasiados intentos. Espera un minuto e intenta de nuevo.'
    if (action === 'login' && error.status === 401) return 'Correo o contraseña incorrectos.'
    if (action === 'register' && error.status === 409) {
      return 'Ya existe una cuenta con ese correo.'
    }
    if (action === 'register' && error.status === 400) {
      return 'Revisa los datos: la contraseña debe tener al menos 8 caracteres.'
    }
  }
  return action === 'login'
    ? 'No se pudo iniciar sesión. Intenta de nuevo.'
    : 'No se pudo crear la cuenta. Intenta de nuevo.'
}
