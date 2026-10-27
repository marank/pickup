import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { ownerColor } from '@/lib/ownerColor'
import { readPreference, writePreference } from '@/lib/storage'
import { initTheme, useTheme } from '@/lib/theme'

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

describe('theme', () => {
  it('follows the system until light or dark is chosen', async () => {
    let listener: () => void = () => {}
    const query = {
      matches: true,
      addEventListener: (_: string, fn: () => void) => (listener = fn),
    }
    window.matchMedia = vi.fn<(q: string) => MediaQueryList>(
      () => query as unknown as MediaQueryList,
    )
    const root = document.createElement('html')
    initTheme(root)
    const theme = useTheme()
    expect(theme.value).toBe('system')
    expect(root.classList.contains('dark')).toBe(true)
    query.matches = false
    listener()
    expect(root.classList.contains('dark')).toBe(false)

    theme.value = 'dark'
    await nextTick()
    expect(root.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('pickup.theme')).toBe('dark')
    theme.value = 'light'
    await nextTick()
    expect(root.classList.contains('dark')).toBe(false)
    theme.value = 'system'
    await nextTick()
  })
})
