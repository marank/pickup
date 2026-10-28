import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import App from '@/App.vue'
import { explorerPath, serveExplorer } from '@/test/explorerData'
import { findButton, pageText, renderAt } from '@/test/render'

const settle = async () => {
  for (let i = 0; i < 5; i++) await flushPromises()
}
const clickLogo = async (init: MouseEventInit = {}) => {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init })
  document.body.querySelector('a[aria-label="Pickup start page"]')!.dispatchEvent(event)
  await settle()
  return event
}

describe('logo in the header', () => {
  it('asks before leaving a pickup and says that you stay signed in', async () => {
    serveExplorer({ pickupOverrides: { member_name: 'Bob' } })
    const { router } = await renderAt(App, explorerPath())
    await settle()

    await clickLogo()
    expect(pageText()).toContain('Leave the pickup?')
    expect(pageText()).toContain('You stay logged in on this device')
    findButton('Stay here').click()
    await settle()
    expect(router.currentRoute.value.name).toBe('explorer')

    await clickLogo()
    findButton('Go to the start page').click()
    await settle()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('goes straight to the start page from other pages', async () => {
    const { router } = await renderAt(App, '/create')
    await clickLogo()
    expect(pageText()).not.toContain('Leave the pickup?')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('leaves Ctrl-click to the browser and scrolls up on the start page', async () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const { router } = await renderAt(App, '/create')
    expect((await clickLogo({ ctrlKey: true })).defaultPrevented).toBe(false)
    expect(router.currentRoute.value.name).toBe('create')

    await router.push('/')
    await settle()
    await clickLogo()
    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    scroll.mockRestore()
  })
})
