import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/errors'

import { uploadErrorMessage } from '../lib/uploadErrors'

describe('uploadErrorMessage', () => {
  it("prefers the server's own words", () => {
    const full = new ApiError(400, { error: 'This pickup is full.' })
    expect(uploadErrorMessage(full)).toBe('This pickup is full.')
    const type = new ApiError(400, { file: ['Only photos and videos.'] })
    expect(uploadErrorMessage(type)).toBe('Only photos and videos.')
  })

  it('explains statuses without a message (nginx pages)', () => {
    expect(uploadErrorMessage(new ApiError(413, undefined))).toContain('too large')
    expect(uploadErrorMessage(new ApiError(429, undefined))).toContain('Too many uploads')
    expect(uploadErrorMessage(new ApiError(502, undefined))).toContain('server had a problem')
    expect(uploadErrorMessage(new ApiError(404, undefined))).toBe(
      'The server refused the file (404).',
    )
  })

  it('tells a lost connection from being offline', () => {
    expect(uploadErrorMessage(new TypeError('Failed to fetch'), true)).toBe(
      'The connection broke off. Try again. (Failed to fetch)',
    )
    expect(uploadErrorMessage(new TypeError('Load failed'), false)).toContain('offline')
    expect(uploadErrorMessage('?', true)).toBe('The connection broke off. Try again.')
  })
})
