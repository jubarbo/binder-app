import { CatalogError } from '@/shared/api/catalogPort'

/**
 * Base URL of binder-api including the version prefix, e.g.
 * `https://api.mantisuy.com/api/v1`. Empty when the app runs without a
 * backend: every port binding then keeps its local implementation.
 */
export const API_URL: string = String(import.meta.env.VITE_API_URL ?? '').trim()

/** True when the build was configured to talk to binder-api. */
export const apiConfigured = API_URL.length > 0

const DEFAULT_TIMEOUT_MS = 15_000

/**
 * A failed binder-api call. Extends `CatalogError` because the API's error
 * envelope `{ error: { message, code, status } }` has exactly that shape, so
 * catalog consumers keep working unchanged. `status` is undefined when the
 * server could not be reached at all.
 */
export class ApiError extends CatalogError {
  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message, options)
    this.name = 'ApiError'
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  /** Serialized as JSON. */
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
  /** Override for tests; defaults to `API_URL`. */
  baseUrl?: string
}

async function toApiError(response: Response): Promise<ApiError> {
  let message: string | undefined
  let code: string | undefined
  try {
    const body = (await response.json()) as { error?: { message?: string; code?: string } }
    message = body.error?.message
    code = body.error?.code
  } catch {
    // Non-JSON error body (proxy page, empty 502): fall back to the status.
  }
  return new ApiError(message ?? `Request failed with status ${response.status}`, {
    status: response.status,
    code,
  })
}

/**
 * One JSON request to binder-api. Always sends the httpOnly session cookie
 * (`credentials: 'include'`); the API decides who the caller is.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const base = (options.baseUrl ?? API_URL).replace(/\/+$/, '')
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      signal,
    })
  } catch (error) {
    const name = (error as { name?: unknown } | null)?.name
    if (name === 'TimeoutError') throw new ApiError('The server took too long to answer. Try again.')
    if (name === 'AbortError') throw error
    throw new ApiError('Could not reach the server. Check your network connection.')
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T
  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError('The server returned a malformed response.', { status: response.status })
  }
}
