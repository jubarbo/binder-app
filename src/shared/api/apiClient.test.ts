import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from '@/shared/api/apiClient'
import { CatalogError } from '@/shared/api/catalogPort'

const fetchMock = vi.fn()

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the session cookie and a JSON body, and returns the parsed response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 'u1' }))

    const result = await apiRequest<{ id: string }>('/auth/login', {
      method: 'POST',
      body: { email: 'a@b.c' },
      baseUrl: 'https://api.example.com/api/v1/',
    })

    expect(result).toEqual({ id: 'u1' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/api/v1/auth/login')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.c' }))
    expect(new Headers(init.headers).get('content-type')).toBe('application/json')
  })

  it('resolves to undefined on 204 No Content', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(apiRequest('/auth/logout', { method: 'POST', baseUrl: 'http://x' })).resolves.toBeUndefined()
  })

  it('maps the API error envelope to an ApiError (a CatalogError) with status and code', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, { error: { message: 'No card found', code: 'not_found', status: 404 } }),
    )

    const error = await apiRequest('/catalog/cards/x', { baseUrl: 'http://x' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toBeInstanceOf(CatalogError)
    expect(error).toMatchObject({ message: 'No card found', status: 404, code: 'not_found' })
  })

  it('reports an unreachable server as an ApiError without a status', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await apiRequest('/users/me', { baseUrl: 'http://x' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBeUndefined()
  })

  it('lets a caller abort propagate untouched', async () => {
    const abort = new DOMException('aborted', 'AbortError')
    fetchMock.mockRejectedValue(abort)
    await expect(apiRequest('/users/me', { baseUrl: 'http://x' })).rejects.toBe(abort)
  })
})
