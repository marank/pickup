import { describe, expect, it } from 'vitest'

import { api, formBody } from '@/api/client'
import { ApiError, apiErrorMessage, isNotFound, unwrap } from '@/api/errors'
import { on, requests } from '@/test/fakeApi'
import { createdPickup, pickup, PICKUP_ID } from '@/test/factories'

describe('API client', () => {
  it('fetches the CSRF cookie once and sends the token with unsafe requests only', async () => {
    on('POST', '/api/pickups/', { status: 201, body: createdPickup() })
    on('GET', '/api/pickups/:id/', { body: pickup() })

    await api.GET('/api/pickups/{id}/', { params: { path: { id: PICKUP_ID } } })
    await api.POST('/api/pickups/')
    await api.POST('/api/pickups/')

    expect(requests.map((r) => `${r.method} ${r.path} ${r.csrf}`)).toEqual([
      `GET /api/pickups/${PICKUP_ID}/ null`,
      'GET /api/csrf null',
      'POST /api/pickups/ test-token',
      'POST /api/pickups/ test-token',
    ])
  })

  it('sends files as multipart form data', () => {
    const file = new File(['x'], 'a.jpg')
    const { bodySerializer } = formBody({ file, caption: 'hi', skipped: undefined })
    const data = bodySerializer()
    expect(data.get('caption')).toBe('hi')
    expect((data.get('file') as File).name).toBe('a.jpg')
    expect(data.has('skipped')).toBe(false)
  })
})

describe('errors', () => {
  it('unwraps data or throws an ApiError with the response body', async () => {
    on('GET', '/api/pickups/:id/', { status: 404, body: { detail: 'Not found.' } })
    const error = await unwrap(
      api.GET('/api/pickups/{id}/', { params: { path: { id: 'x' } } }),
    ).catch((err: unknown) => err)
    expect(error).toBeInstanceOf(ApiError)
    expect(isNotFound(error)).toBe(true)
  })

  it('turns API errors into messages', () => {
    expect(apiErrorMessage(new ApiError(403, { error: 'Nope' }), 'fallback')).toBe('Nope')
    expect(apiErrorMessage(new ApiError(400, { user_name: ['Taken'] }), 'fallback')).toBe('Taken')
    expect(apiErrorMessage(new ApiError(400, { count: [3] }), 'fallback')).toBe('fallback')
    expect(apiErrorMessage(new ApiError(500, 'oops'), 'fallback')).toBe('fallback')
    expect(apiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback')
    expect(new ApiError(502, null).message).toBe('Request failed (502)')
    expect(isNotFound(new Error('x'))).toBe(false)
  })
})
