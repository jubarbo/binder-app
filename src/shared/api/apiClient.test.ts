import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError, apiBaseUrl, apiRequest } from '@/shared/api/apiClient'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api/v1/')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function respond(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'Status',
    json: async () => {
      if (body === undefined) throw new SyntaxError('no body')
      return body
    },
  } as Response
}

describe('apiClient', () => {
  it('normalizes the base URL and sends the session cookie with every request', async () => {
    expect(apiBaseUrl()).toBe('http://localhost:3000/api/v1')
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true }))
    await apiRequest('/users/me')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/v1/users/me')
    expect(init).toMatchObject({ method: 'GET', credentials: 'include' })
  })

  it('sends JSON bodies with a content type', async () => {
    fetchMock.mockResolvedValueOnce(respond(201, { id: 'u1' }))
    await apiRequest('/auth/register', { method: 'POST', body: { email: 'a@b.co' } })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.body).toBe('{"email":"a@b.co"}')
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('resolves undefined for 204 No Content', async () => {
    fetchMock.mockResolvedValueOnce(respond(204))
    await expect(apiRequest('/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })

  it('turns the API error envelope into an ApiError with status and code', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(409, { error: { message: 'An account with this email already exists', code: 'conflict', status: 409 } }),
    )
    const error = await apiRequest('/auth/register', { method: 'POST', body: {} }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, code: 'conflict', message: 'An account with this email already exists' })
  })

  it('falls back to the status text when the body is not the API envelope', async () => {
    fetchMock.mockResolvedValueOnce(respond(502))
    await expect(apiRequest('/health')).rejects.toMatchObject({ status: 502, message: 'Status' })
  })

  it('reports an unreachable server with status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(apiRequest('/health')).rejects.toMatchObject({ name: 'ApiError', status: 0 })
  })

  it('lets aborts propagate untouched', async () => {
    const abort = new DOMException('aborted', 'AbortError')
    fetchMock.mockRejectedValueOnce(abort)
    await expect(apiRequest('/health')).rejects.toBe(abort)
  })

  it('refuses to call anything when VITE_API_URL is not set', async () => {
    vi.stubEnv('VITE_API_URL', '')
    await expect(apiRequest('/health')).rejects.toMatchObject({ status: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
