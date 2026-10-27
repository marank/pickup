import { describe, expect, it } from 'vitest'

import App from '@/App.vue'
import { pageText, renderAt } from '@/test/render'

describe('App', () => {
  it('renders the layout around the current page', async () => {
    const { wrapper } = await renderAt(App, '/')
    expect(wrapper.find('header a[href="/"]').text()).toBe('Pickup')
    expect(pageText()).toContain('Start a new pickup')
  })
})
