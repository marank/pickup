import { afterEach, describe, expect, it, vi } from 'vitest'

import App from '@/App.vue'
import { renderAt } from '@/test/render'

const splash = () => document.body.querySelector('[role="status"] .sr-only')

describe('splash screen', () => {
  afterEach(() => {
    vi.useRealTimers()
    window.history.replaceState(null, '', '/')
  })

  it('plays the logo intro when a pickup is opened by its link, then goes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    window.history.replaceState(null, '', '/pickup/p1')
    await renderAt(App, '/')
    expect(splash()?.textContent).toBe('Opening the pickup…')
    await vi.advanceTimersByTimeAsync(2000)
    expect(splash()).toBeNull()
  })

  it('leaves personal links to their own page', async () => {
    window.history.replaceState(null, '', '/pickup/p1/member/key')
    await renderAt(App, '/')
    expect(splash()).toBeNull()
  })

  it('is not shown on other pages', async () => {
    await renderAt(App, '/')
    expect(splash()).toBeNull()
  })
})
