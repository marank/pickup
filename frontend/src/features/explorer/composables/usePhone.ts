import { useMediaQuery } from '@vueuse/core'

/**
 * Below Tailwind's sm breakpoint the explorer has a compact layout: the pickup's title in the
 * header, one toolbar, an upload button and content up to the edges.
 */
export function usePhone() {
  return useMediaQuery('(max-width: 639px)')
}
