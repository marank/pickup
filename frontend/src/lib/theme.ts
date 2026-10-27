import { ref, watch } from 'vue'

import { readPreference, writePreference } from './storage'

const THEMES = ['system', 'light', 'dark'] as const
type Theme = (typeof THEMES)[number]

const theme = ref<Theme>(readPreference('pickup.theme', THEMES, 'system'))

/**
 * Apply the chosen colour scheme (shadcn components switch on `.dark`); "system" keeps
 * following the operating system's setting.
 */
export function initTheme(root: HTMLElement = document.documentElement): void {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = () =>
    root.classList.toggle(
      'dark',
      theme.value === 'dark' || (theme.value === 'system' && query.matches),
    )
  query.addEventListener('change', apply)
  watch(
    theme,
    (value) => {
      writePreference('pickup.theme', value)
      apply()
    },
    { immediate: true },
  )
}

/** The colour scheme setting, shared by the whole app. */
export function useTheme() {
  return theme
}
