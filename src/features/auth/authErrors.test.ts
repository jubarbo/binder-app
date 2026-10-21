import { describe, it, expect } from 'vitest'
import { authErrorMessage } from '@/features/auth/authErrors'
import { ApiError } from '@/shared/api/apiClient'
import { AuthUnavailableError } from '@/shared/api/authPort'

describe('authErrorMessage', () => {
  it('keeps the honest no-backend message', () => {
    expect(authErrorMessage(new AuthUnavailableError(), 'login')).toMatch(/backend no está conectado/)
  })

  it('maps API failures to specific messages', () => {
    expect(authErrorMessage(new ApiError('x', 401, 'unauthorized'), 'login')).toBe('Correo o contraseña incorrectos.')
    expect(authErrorMessage(new ApiError('x', 409, 'conflict'), 'register')).toBe('Ya existe una cuenta con ese correo.')
    expect(authErrorMessage(new ApiError('x', 429, 'rate_limited'), 'login')).toMatch(/Demasiados intentos/)
    expect(authErrorMessage(new ApiError('x', 0), 'register')).toMatch(/No se pudo conectar/)
    expect(authErrorMessage(new ApiError('x', 400, 'bad_request'), 'register')).toMatch(/8 caracteres/)
  })

  it('falls back to the generic message', () => {
    expect(authErrorMessage(new Error('?'), 'login')).toBe('No se pudo iniciar sesión. Intenta de nuevo.')
    expect(authErrorMessage(new ApiError('x', 500), 'register')).toBe('No se pudo crear la cuenta. Intenta de nuevo.')
  })
})
