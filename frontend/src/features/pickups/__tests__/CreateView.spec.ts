import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

/** "Reduce motion": no packing animation, so the tests don't wait for it. */
function reduceMotion(reduce = true) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: reduce && query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
}

beforeEach(() => reduceMotion())
afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, 'matchMedia')
})

describe('create page', () => {
  async function create(email = '', beforeSubmit = () => {}) {
    on('POST', '/api/pickups/', { status: 201, body: createdPickup() })
    const result = await renderAt(CreateView, '/create')
    beforeSubmit()
    await type('#create-title', ' Anna & Mark ')
    await type('#create-name', 'Anna ')
    if (email) await type('#create-email', email)
    $<HTMLInputElement>('input[name="join_policy"][value="invite"]').click()
    $('form').dispatchEvent(new Event('submit'))
    await settle()
    return result
  }

  it('creates nothing until the form is sent, then shows the links as second step', async () => {
    const writeText = clipboard()
    await create('anna@example.com', () => {
      expect($('[aria-current="step"]').textContent).toContain('Details')
      expect(requests.some((r) => r.method === 'POST')).toBe(false)
    })
    expect(requests.find((r) => r.method === 'POST')?.body).toEqual({
      title: 'Anna & Mark',
      creator_name: 'Anna',
      creator_email: 'anna@example.com',
      join_policy: 'invite',
    })
    expect($('[aria-current="step"]').textContent).toContain('Links')
    const step = $('section[aria-label="Your pickup is ready"]')
    const values = Array.from(step.querySelectorAll<HTMLInputElement>('input[readonly]')).map(
      (input) => input.value,
    )
    expect(values).toEqual([
      `${window.location.origin}/pickup/${PICKUP_ID}`,
      `${window.location.origin}/pickup/${PICKUP_ID}/member/secret-key`,
    ])
    expect(step.textContent).toContain('We also emailed it to you.')
    expect(step.querySelector('canvas[role="img"]')).not.toBeNull()
    expect(document.body.querySelector('a[href="/"]')).toBeNull() // no way back to step 1

    findButton('Copy personal link').click()
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(values[1])
  })

  it('packs the pickup with a short animation before showing the links', async () => {
    reduceMotion(false)
    on('POST', '/api/pickups/', { status: 201, body: createdPickup() })
    await renderAt(CreateView, '/create')
    await type('#create-title', 'Party')
    $('form').dispatchEvent(new Event('submit'))
    await flushPromises()
    expect(pageText()).toContain('Creating your pickup…')
    expect(document.body.querySelector('section[aria-label="Your pickup is ready"]')).toBeNull()
    await vi.waitFor(() => expect($('section[aria-label="Your pickup is ready"]')).not.toBeNull(), {
      timeout: 3000,
    })
    expect(pageText()).not.toContain('Creating your pickup…')
  })

  it('opens the pickup from the second step', async () => {
    const { router } = await create()
    expect($('section[aria-label="Your pickup is ready"]').textContent).not.toContain('emailed')
    const open = $<HTMLAnchorElement>(`a[href="/pickup/${PICKUP_ID}"]`)
    expect(open.textContent).toContain('Open the pickup')
    await router.push(open.getAttribute('href')!)
    expect(router.currentRoute.value.name).toBe('explorer')
  })

  it('reports when the QR card cannot be drawn', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const error = vi.spyOn(toast, 'error')
    await create()
    findButton('Save QR card').click()
    await settle()
    expect(error).toHaveBeenCalledWith('Could not create the image')
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
    expect($<HTMLInputElement>('#create-title').value).toBe('Party') // back to the form
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
    await chooseMenuItem('Copy my personal link')
    await settle()
    expect(error).toHaveBeenCalledWith('Join the pickup first.')
  })
})
