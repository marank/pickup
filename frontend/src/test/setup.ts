import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, vi } from 'vitest'

import { fakeFetch, reset } from './fakeApi'

// Before any test module creates the API client (openapi-fetch captures fetch then).
vi.stubGlobal('fetch', fakeFetch)
// jsdom has no scrolling; the router's scrollBehavior calls it.
window.scrollTo = () => {}
// Nor pointer capture or the font loading API, which every browser the app supports has.
if (!('setPointerCapture' in Element.prototype)) {
  Object.assign(Element.prototype, { setPointerCapture() {}, releasePointerCapture() {} })
}
if (!('fonts' in document)) {
  Object.defineProperty(document, 'fonts', { value: { load: () => Promise.resolve([]) } })
}

/** No media query matches (no reduced motion, no dark scheme); specs override it per test. */
function stubMatchMedia() {
  // vitest's jsdom lists the key, but without a value.
  if ((window as Partial<Window>).matchMedia) return
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (media: string) => ({
      matches: false,
      media,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }),
  })
}

beforeEach(() => {
  reset()
  stubMatchMedia()
})

afterEach(async () => {
  const { queryClient } = await import('@/lib/queryClient')
  queryClient.clear()
  document.body.innerHTML = ''
})

// Unmount every test's app, so window listeners (e.g. Ctrl+L) don't leak into the next test.
// Registered last: after-hooks run in reverse order, so this runs before the DOM is cleared.
enableAutoUnmount(afterEach)
