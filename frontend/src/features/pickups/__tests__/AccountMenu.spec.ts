import { DOMWrapper, flushPromises } from '@vue/test-utils'
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
  it('shows the member and switches the colour scheme', async () => {
    await renderApp(explorerPath())
    expect(findButton('Account').textContent).toContain('Alice')
    await openAccount()
    expect(pageText()).toContain('Member of this pickup')
    expect(pageText()).not.toContain('Go to my folder')
    await chooseMenuItem('Dark')
    expect(useTheme().value).toBe('dark')
  })

  it('saves the own name and folder name', async () => {
    on('PATCH', '/api/pickups/:id/session/', { body: {} })
    on('GET', '/api/pickups/:id/session/link/', { body: { member_url: '/x', has_email: false } })
    const success = vi.spyOn(toast, 'success')
    await renderApp(explorerPath())
    await openAccount()
    await chooseMenuItem('Edit my details')
    const field = (id: string) => document.body.querySelector<HTMLInputElement>(id)!
    expect(field('#details-name').value).toBe('Alice')
    expect(field('#details-folder').value).toBe('Alice')
    expect(pageText()).toContain('We send you your personal link to this address.')
    await new DOMWrapper(field('#details-name')).setValue('Alicia')
    await new DOMWrapper(field('#details-folder')).setValue('Alicia’s photos')
    findButton('Save').click()
    for (let i = 0; i < 5; i++) await flushPromises()
    expect(requests.find((r) => r.method === 'PATCH')).toMatchObject({
      path: `/api/pickups/${PICKUP_ID}/session/`,
      body: { user_name: 'Alicia', folder_name: 'Alicia’s photos' },
    })
    expect(requests.some((r) => r.path.endsWith('/session/email/'))).toBe(false)
    expect(success).toHaveBeenCalledWith('Saved')
  })

  it('sends a new address for confirmation and reports errors', async () => {
    on('GET', '/api/pickups/:id/session/link/', { body: { member_url: '/x', has_email: true } })
    on('POST', '/api/pickups/:id/session/email/', {
      body: { message: 'We sent a confirmation link to the new address.' },
    })
    const success = vi.spyOn(toast, 'success')
    const error = vi.spyOn(toast, 'error')
    await renderApp(explorerPath())
    await openAccount()
    await chooseMenuItem('Edit my details')
    for (let i = 0; i < 5; i++) await flushPromises()
    expect(pageText()).toContain('only saved after you confirm it')
    const email = document.body.querySelector<HTMLInputElement>('#details-email')!
    await new DOMWrapper(email).setValue('alice@new.example')
    findButton('Save').click()
    for (let i = 0; i < 5; i++) await flushPromises()
    expect(requests.some((r) => r.method === 'PATCH')).toBe(false)
    expect(success).toHaveBeenCalledWith('We sent a confirmation link to the new address.')

    on('PATCH', '/api/pickups/:id/session/', {
      status: 400,
      body: { error: 'This name is already taken in this pickup.' },
    })
    await openAccount()
    await chooseMenuItem('Edit my details')
    await new DOMWrapper(document.body.querySelector<HTMLInputElement>('#details-name')!).setValue(
      'Bob',
    )
    findButton('Save').click()
    for (let i = 0; i < 5; i++) await flushPromises()
    expect(error).toHaveBeenCalledWith('This name is already taken in this pickup.')
  })

  it('leaves the pickup on this device after a warning', async () => {
    on('DELETE', '/api/pickups/:id/session/', { status: 204 })
    const success = vi.spyOn(toast, 'success')
    const { router } = await renderApp(explorerPath(ALICE))
    await openAccount()
    await chooseMenuItem('Log out')
    expect(pageText()).toContain('open your personal link')
    const leave = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'),
    ).find((button) => button.textContent?.trim() === 'Log out')!
    leave.click()
    for (let i = 0; i < 5; i++) await flushPromises()
    expect(
      requests.some(
        (r) => r.method === 'DELETE' && r.path === `/api/pickups/${PICKUP_ID}/session/`,
      ),
    ).toBe(true)
    expect(success).toHaveBeenCalledWith('You are logged out')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('reports a failed leave', async () => {
    on('DELETE', '/api/pickups/:id/session/', { status: 500, body: {} })
    const error = vi.spyOn(toast, 'error')
    await renderApp(explorerPath())
    await openAccount()
    await chooseMenuItem('Log out')
    Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'))
      .find((button) => button.textContent?.trim() === 'Log out')!
      .click()
    for (let i = 0; i < 5; i++) await flushPromises()
    expect(error).toHaveBeenCalledWith('Could not log out')
  })

  it('tells the creator to keep their personal link', async () => {
    serveExplorer({ member: false, creator: true })
    await renderAt(App, explorerPath())
    for (let i = 0; i < 5; i++) await flushPromises()
    expect(findButton('Account').textContent).toContain('Creator')
    await openAccount()
    expect(pageText()).toContain('Creator of this pickup')
    await chooseMenuItem('Log out')
    expect(pageText()).toContain('open your personal link')
  })

  it('offers guests to join, without a leave option', async () => {
    const { router } = await renderApp(explorerPath(), { member: false })
    expect(findButton('Account').textContent).toContain('Guest')
    await openAccount()
    expect(pageText()).toContain('Viewing as a guest')
    expect(pageText()).not.toContain('Log out')
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
