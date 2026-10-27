import { afterEach, describe, expect, it, vi } from 'vitest'

import { ownerColor } from '@/lib/ownerColor'
import { readPreference, writePreference } from '@/lib/storage'
import { followSystemTheme } from '@/lib/theme'

afterEach(() => vi.restoreAllMocks())

describe('ownerColor', () => {
  it('gives each name a stable palette colour', () => {
    expect(ownerColor('Alice')).toBe(ownerColor('Alice'))
    expect(ownerColor('Alice')).toMatch(/^var\(--owner-[1-6]\)$/)
    const colours = new Set(
      ['Alice', 'Bob', 'Chloé', 'Dan', 'Eve', 'Frank', 'Grandma'].map(ownerColor),
    )
    expect(colours.size).toBeGreaterThan(2)
  })
})

describe('preferences', () => {
  it('survives storage that is not available', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(readPreference('x', ['a', 'b'] as const, 'a')).toBe('a')
    expect(() => writePreference('x', 'b')).not.toThrow()
  })
})

describe('followSystemTheme', () => {
  it('switches the dark class with the system setting', () => {
    let listener: () => void = () => {}
    const query = {
      matches: true,
      addEventListener: (_: string, fn: () => void) => (listener = fn),
    }
    window.matchMedia = vi.fn<(q: string) => MediaQueryList>(
      () => query as unknown as MediaQueryList,
    )
    const root = document.createElement('html')
    followSystemTheme(root)
    expect(root.classList.contains('dark')).toBe(true)
    query.matches = false
    listener()
    expect(root.classList.contains('dark')).toBe(false)
  })
})
