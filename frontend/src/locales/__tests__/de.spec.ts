import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import { formatDate, locale, plural, t, useLanguage } from '@/lib/i18n'

import de from '../de'
import common from '../de/common'
import explorer from '../de/explorer'
import explorerLogic from '../de/explorerLogic'
import home from '../de/home'
import pickups from '../de/pickups'

// Every source file with texts (not tests, not the generated API types).
const sources = import.meta.glob<string>(
  [
    '/src/**/*.{vue,ts}',
    '!/src/**/__tests__/**',
    '!/src/api/schema.d.ts',
    '!/src/locales/**',
    '!/src/lib/i18n.ts', // its examples
  ],
  { query: '?raw', import: 'default', eager: true },
)

const STRING = String.raw`(['"])((?:\\.|(?!\1).)*)\1`
const unescape = (text: string) => text.replace(/\\(.)/g, '$1')

function usedTexts() {
  const single = new Set<string>()
  const plurals = new Set<string>()
  for (const code of Object.values(sources)) {
    for (const match of code.matchAll(new RegExp(String.raw`\bt\(\s*${STRING}`, 'g')))
      single.add(unescape(match[2]!))
    const pluralCall = String.raw`\bplural\(\s*[^,]+?,\s*${STRING}\s*,\s*(['"])((?:\\.|(?!\3).)*)\3`
    for (const match of code.matchAll(new RegExp(pluralCall, 'g'))) plurals.add(unescape(match[4]!))
  }
  return { single, plurals }
}

describe('German texts', () => {
  const { single, plurals } = usedTexts()

  it('cover every text the app shows, and nothing else', () => {
    const missing = [...single, ...plurals].filter((text) => !(text in de))
    const unused = Object.keys(de).filter((text) => !single.has(text) && !plurals.has(text))
    expect(missing).toEqual([])
    expect(unused).toEqual([])
  })

  it('say the same in every area when the English is the same', () => {
    const seen = new Map<string, unknown>()
    const conflicts: string[] = []
    for (const part of [common, home, pickups, explorer, explorerLogic])
      for (const [english, german] of Object.entries(part)) {
        if (seen.has(english) && JSON.stringify(seen.get(english)) !== JSON.stringify(german))
          conflicts.push(
            `${english}: ${JSON.stringify(seen.get(english))} / ${JSON.stringify(german)}`,
          )
        seen.set(english, german)
      }
    expect(conflicts).toEqual([])
  })

  it('keep placeholders and plural forms', () => {
    const names = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)]
        .map((m) => m[1])
        .sort()
        .join()
    const wrong = Object.entries(de).filter(([english, german]) => {
      if (!plurals.has(english))
        return typeof german !== 'string' || names(german) !== names(english)
      return !Array.isArray(german) || names(german[1]) !== names(english)
    })
    expect(wrong).toEqual([])
  })
})

describe('switching the language', () => {
  afterEach(async () => {
    useLanguage().value = 'auto'
    await flushPromises()
  })

  it('follows the choice, falls back to English and fills in placeholders', async () => {
    expect(locale.value).toBe('en') // jsdom's browser language
    expect(t('Language')).toBe('Language')
    useLanguage().value = 'de'
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve))
    expect(document.documentElement.lang).toBe('de')
    expect(t('Language')).toBe('Sprache')
    expect(t('No such text {x}', { x: 1 })).toBe('No such text 1')
    expect(plural(2, '1 thing', '{n} things')).toBe('2 things') // not translated: English
    expect(plural(2, '1 item', '{n} items')).toBe('2 Elemente')
    expect(formatDate('2026-12-15T12:00:00Z', { month: 'long' })).toBe('Dezember')
  })
})
