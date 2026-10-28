import { describe, expect, it } from 'vitest'

import App from '@/App.vue'
import { pageText, renderAt } from '@/test/render'

describe('App', () => {
  it('renders the layout around the current page', async () => {
    const { wrapper } = await renderAt(App, '/')
    expect(wrapper.find('header a[href="/"] [role="img"]').attributes('aria-label')).toBe('Pickup')
    expect(pageText()).toContain('Start a pickup')
  })
})
