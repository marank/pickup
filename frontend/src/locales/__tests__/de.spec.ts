import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import { formatDate, locale, plural, t, useLanguage, type TextKey } from '@/lib/i18n'

import de from '../de'
import en from '../en'

// Every source file with texts (not tests, not the generated API types, not the dictionaries).
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

type Leaf = string | readonly string[]
function leaves(tree: object, prefix = ''): [string, Leaf][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' || Array.isArray(value)
      ? [[prefix + key, value as Leaf]]
      : leaves(value as object, `${prefix}${key}.`),
  )
}
const placeholders = (value: Leaf) =>
  [
    ...[value]
      .flat()
      .join(' ')
      .matchAll(/\{(\w+)\}/g),
  ]
    .map((m) => m[1])
    .sort()
    .join()

describe('texts', () => {
  const english = leaves(en)
  const german = new Map(leaves(de))

  it('are all used, and only the ones that exist', () => {
    const used = new Set<string>()
    for (const code of Object.values(sources))
      for (const match of code.matchAll(/\b(?:t|plural)\(\s*(?:[^,'"]+,\s*)?'([\w.]+)'/g))
        used.add(match[1]!)
    const unused = english.map(([key]) => key).filter((key) => !used.has(key))
    expect(unused).toEqual([])
  })

  it('exist in German with the same placeholders and plural forms', () => {
    const wrong = english.filter(([key, value]) => {
      const translated = german.get(key)
      return (
        translated === undefined ||
        Array.isArray(translated) !== Array.isArray(value) ||
        placeholders(translated) !== placeholders(value)
      )
    })
    expect(wrong.map(([key]) => key)).toEqual([])
    expect(german.size).toBe(english.length)
  })
})

describe('switching the language', () => {
  afterEach(async () => {
    useLanguage().value = 'auto'
    await flushPromises()
  })

  it('follows the choice, falls back to English and fills in placeholders', async () => {
    expect(locale.value).toBe('en') // jsdom's browser language
    expect(t('app.languageOptions.language')).toBe('Language')
    useLanguage().value = 'de'
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve))
    expect(document.documentElement.lang).toBe('de')
    expect(t('app.languageOptions.language')).toBe('Sprache')
    expect(t('app.copyField.copyLabel', { label: 'Link' })).toBe('Link kopieren')
    expect(plural(1, 'common.nFiles')).toBe('1 Datei')
    expect(plural(3, 'common.nFiles')).toBe('3 Dateien')
    expect(t('app.does.not.exist' as TextKey)).toBe('app.does.not.exist') // never in practice
    expect(formatDate('2026-12-15T12:00:00Z', { month: 'long' })).toBe('Dezember')
  })
})
