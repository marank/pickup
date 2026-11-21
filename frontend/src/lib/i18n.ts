import { computed, ref, watch } from 'vue'

import en from '@/locales/en'

import { readPreference, writePreference } from './storage'

/**
 * German and English. Texts are named by where they appear: `t('explorer.contentPane.nothingHereYet')`,
 * with `{name}` placeholders filled from the second argument. English lives in
 * `src/locales/en/` (always loaded, and the fallback), German in `src/locales/de/` with the
 * same keys, loaded only when needed. Plurals: `plural(n, 'common.nFiles')` picks the
 * `[one, other]` pair. The keys are typed: a misspelt key is a type error.
 * The language follows the browser unless chosen in the account menu.
 */
const LOCALES = ['auto', 'en', 'de'] as const
type Choice = (typeof LOCALES)[number]
export type Locale = Exclude<Choice, 'auto'>
type Params = Record<string, string | number>
type English = typeof en

/** Dotted paths to the texts of `T` whose value is `Leaf`. */
type Paths<T, Leaf, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends Leaf
    ? `${Prefix}${K}`
    : T[K] extends string | readonly unknown[]
      ? never
      : Paths<T[K], Leaf, `${Prefix}${K}.`>
}[keyof T & string]
export type TextKey = Paths<English, string>
export type PluralKey = Paths<English, readonly [string, string]>

/** A translation: the same keys as English, any wording. */
export type Messages = {
  [K in keyof English]: Shape<English[K]>
}
type Shape<T> = T extends readonly [string, string]
  ? readonly [string, string]
  : T extends string
    ? string
    : { [K in keyof T]: Shape<T[K]> }

const choice = ref<Choice>(readPreference('pickup.locale', LOCALES, 'auto'))
const browser = (): Locale =>
  (navigator.languages[0] ?? navigator.language).toLowerCase().startsWith('de') ? 'de' : 'en'
/** The language in use. */
export const locale = computed<Locale>(() => (choice.value === 'auto' ? browser() : choice.value))
const messages = ref<Messages | null>(null)

async function load(target: Locale): Promise<void> {
  messages.value = target === 'de' ? (await import('../locales/de')).default : null
  document.documentElement.lang = target
}

watch(locale, (target) => void load(target))

/** Before the app mounts: the right language from the first paint. */
export async function initI18n(): Promise<void> {
  await load(locale.value)
}

/** The choice in the account menu ('auto': follow the browser). */
export function useLanguage() {
  return computed<Choice>({
    get: () => choice.value,
    set: (value) => {
      choice.value = value
      writePreference('pickup.locale', value)
    },
  })
}

function fill(text: string, params?: Params): string {
  return params
    ? text.replace(/\{(\w+)\}/g, (all, key: string) => String(params[key] ?? all))
    : text
}

function lookup(source: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      source,
    )
}

/** The text in the current language (English if a translation lacks it), placeholders filled. */
export function t(key: TextKey, params?: Params): string {
  const found = lookup(messages.value, key) ?? lookup(en, key)
  return fill(typeof found === 'string' ? found : key, params)
}

/** The singular for exactly 1, else the plural; `{n}` is the count. */
export function plural(n: number, key: PluralKey, params?: Params): string {
  const found = lookup(messages.value, key) ?? lookup(en, key)
  const [one, other] = Array.isArray(found) ? (found as [string, string]) : [key, key]
  return fill(n === 1 ? one : other, { n, ...params })
}

/** A time of day in the current language, e.g. 18:30 or 6:30 PM. */
export function formatTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString(locale.value, { hour: 'numeric', minute: '2-digit' })
}

/** Two dates as one range, e.g. „13.–15. Juni 2026“. */
export function formatDateRange(from: Date, to: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale.value, options).formatRange(from, to)
}

/** A date in the current language, e.g. `formatDate(iso, { dateStyle: 'long' })`. */
export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleDateString(locale.value, options)
}
