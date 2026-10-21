/**
 * Thin HTTP client for binder-api. Every request sends the session cookie
 * (`credentials: 'include'`): auth is an httpOnly cookie the browser carries
 * on its own, so no token ever touches JavaScript (binder-api plan §6.3).
 */

/** binder-api base URL with the version prefix, or `null` when not configured. */
export function apiBaseUrl(): string | null {
  return import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '') || null
}

/** Whether the app is wired to binder-api (read once by the port bindings). */
export const apiConfigured = apiBaseUrl() !== null

/**
 * A failed API call. Carries the HTTP status and the API's error `code`
 * (`not_found`, `unauthorized`, `conflict`, `rate_limited`, ...) from its
 * single error envelope `{ error: { message, code, status } }`. `status` is
 * `0` when the server could not be reached at all.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string; code?: string }
    }
    if (body.error?.message) {
      return new ApiError(body.error.message, response.status, body.error.code)
    }
  } catch {
    // Not the API's JSON envelope (proxy error page, etc.): fall through.
  }
  return new ApiError(
    response.statusText || `Request failed with status ${response.status}`,
    response.status,
  )
}

/**
 * Call binder-api and parse the JSON response. Resolves `undefined` for
 * `204 No Content`. Aborts propagate untouched so TanStack Query can cancel.
 */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, signal }: RequestOptions = {},
): Promise<T> {
  const base = apiBaseUrl()
  if (!base) throw new ApiError('binder-api is not configured (VITE_API_URL).', 0)

  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    // Checked by name: an abort is a DOMException, which is not an Error subclass everywhere.
    if ((error as { name?: unknown } | null)?.name === 'AbortError') throw error
    throw new ApiError('Could not reach the server. Check your network connection.', 0)
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T

  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError('The server returned a malformed response.', response.status)
  }
}
