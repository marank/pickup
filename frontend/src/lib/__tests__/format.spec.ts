import { describe, expect, it } from 'vitest'

import { formatFileSize, formatRelativeDate } from '@/lib/format'

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [2048, '2 KB'],
    [5 * 1024 ** 3, '5 GB'],
    [3 * 1024 ** 5, '3072 TB'],
  ])('%i → %s', (bytes, text) => {
    expect(formatFileSize(bytes)).toBe(text)
  })
})

describe('formatRelativeDate', () => {
  const now = new Date(2026, 9, 27, 15, 0)
  it.each([
    [new Date(2026, 9, 27, 1, 0), 'Today'],
    [new Date(2026, 9, 26, 23, 0), 'Yesterday'],
    [new Date(2026, 9, 23, 12, 0), '4 days ago'],
  ])('%s → %s', (date, text) => {
    expect(formatRelativeDate(date.toISOString(), now)).toBe(text)
  })

  it('falls back to the date after a week', () => {
    const old = new Date(2026, 8, 1)
    expect(formatRelativeDate(old.toISOString(), now)).toBe(old.toLocaleDateString())
  })
})
