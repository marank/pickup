import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'

import App from '@/App.vue'
import CreateView from '@/features/pickups/views/CreateView.vue'
import { on, requests } from '@/test/fakeApi'
import { explorerPath, serveExplorer } from '@/test/explorerData'
import { createdPickup, PICKUP_ID } from '@/test/factories'
import { chooseMenuItem, findButton, pageText, renderAt } from '@/test/render'

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.body.querySelector<T>(selector)!
const type = (selector: string, value: string) => new DOMWrapper($(selector)).setValue(value)
const settle = async () => {
  for (let i = 0; i < 5; i++) await flushPromises()
}
const clipboard = (writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue()) => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return writeText
}

afterEach(() => vi.restoreAllMocks())

describe('create page', () => {
  it('creates nothing until the form is sent, then opens the new pickup', async () => {
    on('POST', '/api/pickups/', { status: 201, body: createdPickup() })
    const { router } = await renderAt(CreateView, '/create')
    expect(pageText()).toContain('Start a pickup')
    expect(requests.some((r) => r.method === 'POST')).toBe(false)

    await type('#create-title', ' Anna & Mark ')
    await type('#create-name', 'Anna ')
    await type('#create-email', 'anna@example.com')
    $<HTMLInputElement>('input[name="join_policy"][value="invite"]').click()
    $('form').dispatchEvent(new Event('submit'))
    await settle()

    expect(requests.find((r) => r.method === 'POST')?.body).toEqual({
      title: 'Anna & Mark',
      creator_name: 'Anna',
      creator_email: 'anna@example.com',
      join_policy: 'invite',
    })
    await vi.waitFor(() =>
      expect(router.currentRoute.value.fullPath).toBe(`/pickup/${PICKUP_ID}?welcome=1`),
    )
  })

  it('shows what went wrong next to the field', async () => {
    on('POST', '/api/pickups/', { status: 400, body: { creator_email: ['Enter a valid email.'] } })
    const error = vi.spyOn(toast, 'error')
    await renderAt(CreateView, '/create')
    await type('#create-title', 'Party')
    $('form').dispatchEvent(new Event('submit'))
    await settle()
    expect(pageText()).toContain('Enter a valid email.')
    expect(error).toHaveBeenCalled()
  })
})

describe('welcome after creating', () => {
  async function renderWelcome(hasEmail = false) {
    serveExplorer({ member: false, creator: true })
    on('GET', '/api/pickups/:id/session/link/', {
      body: { member_url: `/pickup/${PICKUP_ID}/member/secret`, has_email: hasEmail },
    })
    const result = await renderAt(App, `${explorerPath()}?welcome=1`)
    await settle()
    return result
  }

  it('shows the share and creator links once, until dismissed', async () => {
    const writeText = clipboard()
    const { router } = await renderWelcome(true)
    const card = $('section[aria-label="Your pickup is ready"]')
    const values = Array.from(card.querySelectorAll<HTMLInputElement>('input[readonly]')).map(
      (input) => input.value,
    )
    expect(values).toEqual([
      `${window.location.origin}/pickup/${PICKUP_ID}`,
      `${window.location.origin}/pickup/${PICKUP_ID}/member/secret`,
    ])
    expect(card.textContent).toContain('We also emailed it to you.')
    findButton('Copy creator link').click()
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(values[1])

    findButton(/QR card/).click()
    await settle()
    expect($('[role="dialog"]').textContent).toContain('Invite people')
    findButton('Close').click()
    await settle()

    findButton('Dismiss').click()
    await settle()
    expect(router.currentRoute.value.query).toEqual({})
    expect(document.body.querySelector('section[aria-label="Your pickup is ready"]')).toBeNull()
  })

  it('reports a failed copy', async () => {
    clipboard(vi.fn<(text: string) => Promise<void>>().mockRejectedValue(new Error('denied')))
    const error = vi.spyOn(toast, 'error')
    await renderWelcome()
    expect($('section[aria-label="Your pickup is ready"]').textContent).not.toContain('emailed')
    findButton('Copy share link').click()
    await flushPromises()
    expect(error).toHaveBeenCalledWith('Could not copy the share link')
  })

  it('is only for the creator', async () => {
    serveExplorer()
    await renderAt(App, `${explorerPath()}?welcome=1`)
    await settle()
    expect(document.body.querySelector('section[aria-label="Your pickup is ready"]')).toBeNull()
  })
})

describe('personal link in the account menu', () => {
  const openAccount = async () => {
    findButton('Account').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    await flushPromises()
  }

  it('copies the own link again', async () => {
    const writeText = clipboard()
    const success = vi.spyOn(toast, 'success')
    serveExplorer()
    on('GET', '/api/pickups/:id/session/link/', {
      body: { member_url: `/pickup/${PICKUP_ID}/member/alice`, has_email: false },
    })
    await renderAt(App, explorerPath())
    await settle()
    await openAccount()
    await chooseMenuItem('Copy my personal link')
    await settle()
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/pickup/${PICKUP_ID}/member/alice`,
    )
    expect(success).toHaveBeenCalledWith('Personal link copied')
  })

  it('reports when the link is not available', async () => {
    clipboard()
    const error = vi.spyOn(toast, 'error')
    serveExplorer({ member: false, creator: true })
    on('GET', '/api/pickups/:id/session/link/', {
      status: 403,
      body: { error: 'Join the pickup first.' },
    })
    await renderAt(App, explorerPath())
    await settle()
    await openAccount()
    await chooseMenuItem('Copy my creator link')
    await settle()
    expect(error).toHaveBeenCalledWith('Join the pickup first.')
  })
})
