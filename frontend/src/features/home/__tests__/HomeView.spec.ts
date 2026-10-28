import { describe, expect, it, vi } from 'vitest'

import HomeView from '@/features/home/views/HomeView.vue'
import { PICKUP_ID } from '@/test/factories'
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

  it.each([
    [PICKUP_ID, PICKUP_ID],
    [`https://pickup.example.com/pickup/${PICKUP_ID}/`, PICKUP_ID],
  ])('opens a pickup from %s', async (input, pickupId) => {
    const { wrapper, router } = await renderAt(HomeView, '/')
    await wrapper.find('input[aria-label="Share link"]').setValue(input)
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe(`/pickup/${pickupId}`))
  })
})
