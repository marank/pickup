import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'

import HomeView from '@/features/home/views/HomeView.vue'
import { on, requests } from '@/test/fakeApi'
import { createdPickup, PICKUP_ID } from '@/test/factories'
import { findButton, pageText, renderAt } from '@/test/render'

afterEach(() => vi.restoreAllMocks())

describe('HomeView', () => {
  it('creates a pickup and shows the creator and share links', async () => {
    on('POST', '/api/pickups/', { status: 201, body: createdPickup() })
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { wrapper } = await renderAt(HomeView, '/')

    findButton(/Start a pickup/).click()
    await flushPromises()

    const values = wrapper
      .findAll('input[readonly]')
      .map((input) => (input.element as HTMLInputElement).value)
    expect(values).toEqual([
      `${window.location.origin}/pickup/${PICKUP_ID}/member/secret-key`,
      `${window.location.origin}/pickup/${PICKUP_ID}/`,
    ])

    findButton('Copy creator link').click()
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(values[0])
    expect(pageText()).toContain('Open the pickup')
  })

  it('sends the optional creator name and email', async () => {
    on('POST', '/api/pickups/', { status: 201, body: createdPickup() })
    const { wrapper } = await renderAt(HomeView, '/')
    findButton(/Add your name and email/).click()
    await flushPromises()
    await wrapper.find('#creator-name').setValue(' Anna ')
    await wrapper.find('#creator-email').setValue('anna@example.com')
    findButton(/Start a pickup/).click()
    await flushPromises()
    expect(requests.find((r) => r.method === 'POST' && r.path === '/api/pickups/')?.body).toEqual({
      creator_name: 'Anna',
      creator_email: 'anna@example.com',
    })
  })

  it('explains how it works and answers questions', async () => {
    await renderAt(HomeView, '/')
    expect(pageText()).toContain('Three steps, then everyone’s in')
    expect(pageText()).toContain('Your folder, your rules')
    expect(pageText()).toContain('Who can change or delete things?')
    expect(pageText()).toContain('Beach day') // the drawn explorer preview
  })

  it('reports a failed creation', async () => {
    on('POST', '/api/pickups/', { status: 400, body: { error: 'Slow down' } })
    const error = vi.spyOn(toast, 'error')
    await renderAt(HomeView, '/')
    findButton(/Start a pickup/).click()
    await flushPromises()
    expect(error).toHaveBeenCalledWith('Slow down')
  })

  it('reports a failed copy', async () => {
    on('POST', '/api/pickups/', { status: 201, body: createdPickup() })
    const writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const error = vi.spyOn(toast, 'error')
    await renderAt(HomeView, '/')
    findButton(/Start a pickup/).click()
    await flushPromises()
    findButton('Copy share link').click()
    await flushPromises()
    expect(error).toHaveBeenCalledWith('Could not copy the share link')
  })

  it.each([
    [PICKUP_ID, PICKUP_ID],
    [`https://pickup.example.com/pickup/${PICKUP_ID}/`, PICKUP_ID],
  ])('opens a pickup from %s', async (input, pickupId) => {
    const { wrapper, router } = await renderAt(HomeView, '/')
    await wrapper.find('input[aria-label="Share link"]').setValue(input)
    await wrapper.findAll('form').at(-1)!.trigger('submit')
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe(`/pickup/${pickupId}`))
  })
})
