import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Sent {
  method: string
  url: string
  csrf: string | undefined
}

const sent: Sent[] = []
let respond: (config: InternalAxiosRequestConfig) => { status: number; data: unknown } = () => ({
  status: 200,
  data: {},
})

// Every axios instance created after this uses the fake adapter instead of the network.
axios.defaults.adapter = async (config) => {
  sent.push({
    method: (config.method ?? 'get').toUpperCase(),
    url: config.url ?? '',
    csrf: AxiosHeaders.from(config.headers).get('X-CSRFToken') as string | undefined,
  })
  config.onUploadProgress?.({ loaded: 1, total: 2, bytes: 1, lengthComputable: true })
  config.onUploadProgress?.({ loaded: 1, total: undefined, bytes: 1, lengthComputable: false })
  const { status, data } = respond(config)
  const response = { data, status, statusText: '', headers: {}, config }
  if (status >= 400) {
    throw new AxiosError('failed', String(status), config, null, response)
  }
  return response
}

const { apiErrorMessage, folderApi, mediaApi, pickupApi, uploadApi } = await import('../api')

const clearCookies = () => {
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
}

beforeEach(() => {
  sent.length = 0
  clearCookies()
  respond = (config) => {
    if (config.url === '/api/csrf') document.cookie = 'csrftoken=tok123; path=/'
    return { status: 200, data: {} }
  }
})
afterEach(clearCookies)

describe('CSRF handling', () => {
  it('fetches the CSRF cookie before the first unsafe request and sends the token', async () => {
    await pickupApi.createPickup({ title: 'x' })
    await pickupApi.joinPickup('p1', { name: 'f', user_name: 'u' })
    expect(sent.map((r) => `${r.method} ${r.url}`)).toEqual([
      'GET /api/csrf',
      'POST /api/pickups/',
      'POST /api/pickups/p1/join/',
    ])
    expect(sent[1]!.csrf).toBe('tok123')
  })

  it('does not fetch a token for safe requests', async () => {
    await pickupApi.getPickup('p1')
    expect(sent.map((r) => r.url)).toEqual(['/api/pickups/p1/'])
  })
})

describe('endpoints', () => {
  it('never sends member ids, only the access key once', async () => {
    const file = new File(['x'], 'a.jpg')
    await pickupApi.enterSession('p', 'key')
    await pickupApi.leaveSession('p')
    await pickupApi.getFolders('p')
    await pickupApi.getAllMedia('p')
    await folderApi.getFolder('p', 'f')
    await folderApi.getMedia('p', 'f')
    await folderApi.uploadMedia('p', 'f', { file, caption: 'c' })
    await folderApi.uploadMedia('p', 'f', { file })
    await folderApi.clearFolder('p', 'f')
    await mediaApi.updateCaption('p', 'f', 'm', 'new')
    await mediaApi.deleteMedia('p', 'f', 'm')
    await uploadApi.createSession('p', 'f', {
      file_name: 'a.mp4',
      file_size: 1,
      media_type: 'video',
    })
    await uploadApi.getSession('s')
    const progress = vi.fn<(percent: number) => void>()
    await uploadApi.uploadChunk('s', 0, new Blob(['x']), progress)
    await uploadApi.uploadChunk('s', 1, new Blob(['x']))
    await uploadApi.finalizeSession('s')
    expect(progress).toHaveBeenCalledExactlyOnceWith(50)

    expect(sent.map((r) => `${r.method} ${r.url}`)).toContain('POST /api/pickups/p/session/')
    expect(sent.map((r) => `${r.method} ${r.url}`)).toContain(
      'POST /api/upload-sessions/s/finalize/',
    )
    expect(sent.some((r) => r.url.includes('member_id'))).toBe(false)
  })

  it('rejects failed requests', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    respond = () => ({ status: 401, data: { error: 'nope' } })
    await expect(pickupApi.getPickup('p')).rejects.toBeInstanceOf(AxiosError)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('apiErrorMessage', () => {
  const failure = (data: unknown) =>
    new AxiosError('x', '400', undefined, null, {
      data,
      status: 400,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
    })

  it('prefers the API error, then the first validation message, then the fallback', () => {
    expect(apiErrorMessage(failure({ error: 'Nope' }), 'fb')).toBe('Nope')
    expect(apiErrorMessage(failure({ user_name: ['Taken'] }), 'fb')).toBe('Taken')
    expect(apiErrorMessage(failure({ count: [3] }), 'fb')).toBe('fb')
    expect(apiErrorMessage(new Error('boom'), 'fb')).toBe('fb')
  })
})
