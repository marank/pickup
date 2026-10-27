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
