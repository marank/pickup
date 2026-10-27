import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'

import App from '@/App.vue'
import { useTheme } from '@/lib/theme'
import { on, requests } from '@/test/fakeApi'
import { ALICE, explorerPath, serveExplorer } from '@/test/explorerData'
import { PICKUP_ID } from '@/test/factories'
import { chooseMenuItem, findButton, pageText, renderAt } from '@/test/render'

async function renderApp(path: string, options: Parameters<typeof serveExplorer>[0] = {}) {
  serveExplorer(options)
  const result = await renderAt(App, path)
  for (let i = 0; i < 5; i++) await flushPromises()
  return result
}

async function openAccount() {
  findButton('Account').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flushPromises()
}

afterEach(() => {
  vi.restoreAllMocks()
  useTheme().value = 'system'
})

describe('account menu', () => {
  it('shows the member, goes to their folder and switches the colour scheme', async () => {
    const { router } = await renderApp(explorerPath())
    expect(findButton('Account').textContent).toContain('Alice')
    await openAccount()
    expect(pageText()).toContain('Member of this pickup')
    await chooseMenuItem('Go to my folder')
    await vi.waitFor(() => expect(router.currentRoute.value.params.folderId).toBe(ALICE))

    await openAccount()
    await chooseMenuItem('Dark')
    expect(useTheme().value).toBe('dark')
  })

  it('leaves the pickup on this device after a warning', async () => {
    on('DELETE', '/api/pickups/:id/session/', { status: 204 })
    const success = vi.spyOn(toast, 'success')
    await renderApp(explorerPath(ALICE))
    await openAccount()
    await chooseMenuItem('Leave on this device')
    expect(pageText()).toContain('you need your personal link')
    const leave = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'),
    ).find((button) => button.textContent?.trim() === 'Leave')!
    leave.click()
    for (let i = 0; i < 5; i++) await flushPromises()
    expect(
      requests.some(
        (r) => r.method === 'DELETE' && r.path === `/api/pickups/${PICKUP_ID}/session/`,
      ),
    ).toBe(true)
    expect(success).toHaveBeenCalledWith('You left the pickup on this device')
  })

  it('reports a failed leave', async () => {
    on('DELETE', '/api/pickups/:id/session/', { status: 500, body: {} })
    const error = vi.spyOn(toast, 'error')
    await renderApp(explorerPath())
    await openAccount()
    await chooseMenuItem('Leave on this device')
    Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'))
      .find((button) => button.textContent?.trim() === 'Leave')!
      .click()
    for (let i = 0; i < 5; i++) await flushPromises()
    expect(error).toHaveBeenCalledWith('Could not leave the pickup')
  })

  it('warns the creator about the creator link', async () => {
    serveExplorer({ member: false, creator: true })
    await renderAt(App, explorerPath())
    for (let i = 0; i < 5; i++) await flushPromises()
    expect(findButton('Account').textContent).toContain('Creator')
    await openAccount()
    expect(pageText()).toContain('Creator of this pickup')
    await chooseMenuItem('Leave on this device')
    expect(pageText()).toContain('you need your creator link')
  })

  it('offers guests to join, without a leave option', async () => {
    const { router } = await renderApp(explorerPath(), { member: false })
    expect(findButton('Account').textContent).toContain('Guest')
    await openAccount()
    expect(pageText()).toContain('Viewing as a guest')
    expect(pageText()).not.toContain('Leave on this device')
    await chooseMenuItem('Join this pickup')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('pickup-join'))
  })

  it('has only the colour scheme on the start page', async () => {
    await renderAt(App, '/')
    findButton('Colour scheme').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    await flushPromises()
    await chooseMenuItem('Light')
    expect(useTheme().value).toBe('light')
    expect(document.body.querySelector('button[aria-label="Account"]')).toBeNull()
  })
})
