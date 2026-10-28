import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'

import HomeView from '@/features/home/views/HomeView.vue'
import { on, requests } from '@/test/fakeApi'
import { pageText, renderAt } from '@/test/render'

describe('HomeView', () => {
  it('leads to the create page', async () => {
    await renderAt(HomeView, '/')
    const link = document.body.querySelector<HTMLAnchorElement>('a[href="/create"]')!
    expect(link.textContent).toContain('Start a pickup')
  })

  it('explains how it works and answers questions', async () => {
    await renderAt(HomeView, '/')
    expect(pageText()).toContain('Three steps, then everyone’s in')
    expect(pageText()).toContain('Your folder, your rules')
    expect(pageText()).toContain('Who can change or delete things?')
    expect(pageText()).toContain('Beach day') // the drawn explorer preview
  })

  it('mails an address the list of its pickups', async () => {
    on('POST', '/api/pickups/lookup/', {
      status: 202,
      body: { message: 'If this address belongs to any pickups, we sent you a list.' },
    })
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const { wrapper } = await renderAt(HomeView, '/')
    expect(wrapper.find('input[aria-label="Share link"]').exists()).toBe(false)
    await wrapper.find('input[aria-label="Your email"]').setValue(' anna@example.com ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(requests.find((r) => r.path === '/api/pickups/lookup/')?.body).toEqual({
      email: 'anna@example.com',
    })
    // The button spins for a moment, then a dialog says what happened.
    expect(document.body.querySelector('button[aria-label="Sending"]')).not.toBeNull()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    await vi.advanceTimersByTimeAsync(800)
    vi.useRealTimers()
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(
      'we sent you a list',
    )
  })

  it('reports a rejected address', async () => {
    on('POST', '/api/pickups/lookup/', { status: 400, body: { email: ['Enter a valid email.'] } })
    const error = vi.spyOn(toast, 'error')
    const { wrapper } = await renderAt(HomeView, '/')
    await wrapper.find('input[aria-label="Your email"]').setValue('x@y')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(error).toHaveBeenCalledWith('Enter a valid email.'))
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })
})
