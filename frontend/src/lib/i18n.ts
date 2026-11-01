import { computed, ref, watch } from 'vue'

import { readPreference, writePreference } from './storage'

/**
 * German and English. The English text is the key: `t('Upload')`, `t('Hello {name}', { name })`.
 * German comes from `src/locales/de.ts` (loaded only when needed); a text missing there stays
 * English. Plurals: `plural(n, '1 item', '{n} items')`, keyed by the second form.
 * The language follows the browser unless chosen in the account menu.
 */
const LOCALES = ['auto', 'en', 'de'] as const
type Choice = (typeof LOCALES)[number]
export type Locale = Exclude<Choice, 'auto'>
type Params = Record<string, string | number>
export type Messages = Record<string, string | readonly [one: string, other: string]>

const choice = ref<Choice>(readPreference('pickup.locale', LOCALES, 'auto'))
const browser = (): Locale =>
  (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase().startsWith('de')
    ? 'de'
    : 'en'
/** The language in use. */
export const locale = computed<Locale>(() => (choice.value === 'auto' ? browser() : choice.value))
const messages = ref<Messages>({})

async function load(target: Locale): Promise<void> {
  messages.value = target === 'de' ? (await import('../locales/de')).default : {}
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

/** The text in the current language, with `{name}` placeholders filled in. */
export function t(text: string, params?: Params): string {
  const found = messages.value[text]
  return fill(typeof found === 'string' ? found : text, params)
}

/** `one` for exactly 1, else `other`; `{n}` is the count. */
export function plural(n: number, one: string, other: string, params?: Params): string {
  const found = messages.value[other]
  const [single, many] = Array.isArray(found) ? found : [one, other]
  return fill(n === 1 ? single : many, { n, ...params })
}

/** A date in the current language, e.g. `formatDate(iso, { dateStyle: 'long' })`. */
export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleDateString(locale.value, options)
}
