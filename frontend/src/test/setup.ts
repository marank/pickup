import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, vi } from 'vitest'

import { fakeFetch, reset } from './fakeApi'

// Before any test module creates the API client (openapi-fetch captures fetch then).
vi.stubGlobal('fetch', fakeFetch)
// jsdom has no scrolling; the router's scrollBehavior calls it.
window.scrollTo = () => {}

beforeEach(() => reset())

afterEach(async () => {
  const { queryClient } = await import('@/lib/queryClient')
  queryClient.clear()
  document.body.innerHTML = ''
})

// Unmount every test's app, so window listeners (e.g. Ctrl+L) don't leak into the next test.
// Registered last: after-hooks run in reverse order, so this runs before the DOM is cleared.
enableAutoUnmount(afterEach)
