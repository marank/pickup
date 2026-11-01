import { describe, expect, it } from 'vitest'

import { pickupDates } from '../lib/dates'

const at = '2026-12-15T22:59:59Z'
const day = new Date(at).toLocaleDateString(undefined, { dateStyle: 'medium' })

describe('pickupDates', () => {
  it('says until when uploads go, or that they stopped, and when it is deleted', () => {
    expect(pickupDates(undefined)).toEqual({ readOnly: '', deleted: '' })
    expect(pickupDates({ read_only_at: null, is_read_only: false, expires_at: at })).toEqual({
      readOnly: '',
      deleted: `Deleted after ${day}`,
    })
    expect(pickupDates({ read_only_at: at, is_read_only: false, expires_at: null }).readOnly).toBe(
      `Uploads until ${day}`,
    )
    expect(pickupDates({ read_only_at: at, is_read_only: true, expires_at: null }).readOnly).toBe(
      'Read-only',
    )
  })
})
