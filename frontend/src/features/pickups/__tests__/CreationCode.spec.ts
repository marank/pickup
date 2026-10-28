import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import HomeView from '@/features/home/views/HomeView.vue'
import { creationCode } from '@/features/pickups/composables/useCreation'
import CreateView from '@/features/pickups/views/CreateView.vue'
import { queryClient } from '@/lib/queryClient'
import { on, requests } from '@/test/fakeApi'
import { createdPickup } from '@/test/factories'
import { findButton, pageText, renderAt } from '@/test/render'

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.body.querySelector<T>(selector)!
const settle = async () => {
  for (let i = 0; i < 5; i++) await flushPromises()
}
const mode = (value: 'everyone' | 'code' | 'none') =>
  on('GET', '/api/pickups/creation/', { body: { mode: value } })
const submitCode = async (code: string) => {
  await new DOMWrapper($<HTMLInputElement>('#creation-code')).setValue(code)
  $('#creation-code').closest('form')!.dispatchEvent(new Event('submit'))
  await settle()
}

beforeEach(() => {
  queryClient.removeQueries({ queryKey: ['creation'] })
  creationCode.value = ''
  // No packing animation, so creating doesn't wait for it.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), addEventListener() {} }),
  })
})
afterEach(() => Reflect.deleteProperty(window, 'matchMedia'))

describe('creating pickups with a code', () => {
  it('asks for the code on the start page and sends it with the new pickup', async () => {
    mode('code')
    const { router } = await renderAt(HomeView, '/')
    await settle()
    findButton(/Start a pickup/).click()
    await settle()
    expect(pageText()).toContain('Enter your code')

    on('POST', '/api/pickups/creation/', {
      status: 403,
      body: { error: 'This code is not valid.' },
    })
    await submitCode('0000')
    expect($('[role="alert"]').textContent).toContain('This code is not valid.')
    expect(router.currentRoute.value.name).toBe('home')

    on('POST', '/api/pickups/creation/', { body: { mode: 'code' } })
    await submitCode(' 1234-5678-9012 ')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('create'))
    expect(creationCode.value).toBe('1234-5678-9012')
  })

  it('sends the code when creating and forgets it afterwards', async () => {
    mode('code')
    creationCode.value = '1234-5678-9012'
    on('POST', '/api/pickups/', { status: 201, body: createdPickup() })
    await renderAt(CreateView, '/create')
    await settle()
    expect(document.body.querySelector('#creation-code')).toBeNull() // already accepted
    await new DOMWrapper($<HTMLInputElement>('#create-title')).setValue('Party')
    $('form[aria-label="New pickup"]').dispatchEvent(new Event('submit'))
    await settle()
    expect(
      requests.find((r) => r.method === 'POST' && r.path === '/api/pickups/')?.body,
    ).toMatchObject({ title: 'Party', code: '1234-5678-9012' })
    expect(creationCode.value).toBe('')
  })

  it('asks on /create opened directly, and Cancel goes back to the start page', async () => {
    mode('code')
    const { router } = await renderAt(CreateView, '/create')
    await settle()
    expect(pageText()).toContain('Enter your code')
    findButton('Cancel').click()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('home'))
  })

  it('asks again when the code stopped working', async () => {
    mode('code')
    creationCode.value = 'old-code'
    on('POST', '/api/pickups/', { status: 403, body: { error: 'This code is not valid.' } })
    await renderAt(CreateView, '/create')
    await settle()
    $('form[aria-label="New pickup"]').dispatchEvent(new Event('submit'))
    await settle()
    expect(creationCode.value).toBe('')
    expect(pageText()).toContain('Enter your code')
  })

  it('has no start button when creating is turned off, and leaves /create', async () => {
    mode('none')
    await renderAt(HomeView, '/')
    await settle()
    expect(pageText()).toContain('Creating new pickups is turned off on this server.')
    expect(document.body.querySelector('a[href="/create"]')).toBeNull()

    const { router } = await renderAt(CreateView, '/create')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('home'))
  })
})
