import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'

import App from '@/App.vue'
import { on, requests } from '@/test/fakeApi'
import { explorerPath, serveExplorer } from '@/test/explorerData'
import { chooseMenuItem, findButton, pageText, renderAt } from '@/test/render'

async function settle() {
  for (let i = 0; i < 5; i++) await flushPromises()
}

const field = (selector: string) => document.body.querySelector<HTMLInputElement>(selector)!
const type = (selector: string, value: string) => new DOMWrapper(field(selector)).setValue(value)
const submit = async (selector: string) => {
  field(selector)
    .closest('form')!
    .dispatchEvent(new Event('submit', { bubbles: true }))
  await settle()
}

async function renderApp(options: Parameters<typeof serveExplorer>[0] = {}) {
  serveExplorer(options)
  on('POST', '/api/pickups/:id/session/intro/', { status: 204 })
  await renderAt(App, explorerPath())
  await settle()
}

const dialog = () => document.body.querySelector('[role="dialog"]')
const intro = () => requests.filter((r) => r.path.endsWith('/session/intro/'))
/** A button of the intro (the explorer behind it has a "Back" button too). */
const next = async (label = 'Next') => {
  const buttons = Array.from(dialog()!.querySelectorAll('button'))
  buttons.find((button) => button.textContent?.trim() === label)!.click()
  await settle()
}

afterEach(() => vi.restoreAllMocks())

describe('intro for newcomers', () => {
  it('walks a new member through folder, link, files and expiry', async () => {
    on('GET', '/api/pickups/:id/session/link/', { body: { member_url: '/x', has_email: false } })
    on('POST', '/api/pickups/:id/session/email/', { body: { message: 'Sent.' } })
    const success = vi.spyOn(toast, 'success')
    await renderApp({
      pickupOverrides: {
        intro_seen: false,
        creator_name: 'Anna',
        visibility: 'link',
        expires_at: '2026-12-15T22:59:59Z',
      },
    })
    expect(pageText()).toContain('This is your folder')
    expect(pageText()).toContain('So can anyone who has the pickup')
    expect(pageText()).toContain('Anna can remove files')

    await next()
    expect(pageText()).toContain('Your personal link is your key')
    expect(pageText()).toContain('Only Anna can give you a new one')
    expect(pageText()).toContain('Keep it to yourself: whoever opens it is you here')
    expect(field('input[aria-label="Personal link"]').value).toBe(`${window.location.origin}/x`)
    expect(pageText()).not.toContain('password')
    on('GET', '/api/pickups/:id/session/link/', { body: { member_url: '/x', has_email: true } })
    await next('Email it to me as well')
    expect(document.activeElement?.id).toBe('intro-email')
    await type('#intro-email', 'alice@example.com')
    await submit('#intro-email')
    expect(requests.find((r) => r.path.endsWith('/session/email/'))?.body).toEqual({
      email: 'alice@example.com',
    })
    expect(success).toHaveBeenCalledWith('Sent.')
    expect(pageText()).toContain('Also in your inbox')
    expect(document.body.querySelector('#intro-email')).toBeNull()

    await next()
    expect(pageText()).toContain('Nothing is compressed')
    await next('Back')
    expect(pageText()).toContain('Your personal link is your key')
    await next()
    await next()
    expect(pageText()).toMatch(/Available until .*2026/) // in the browser's language
    expect(intro()).toHaveLength(0)
    await next("Let's go")
    expect(dialog()).toBeNull()
    expect(intro()).toHaveLength(1)
  })

  it('tells members of a closed pickup with a password what applies to them', async () => {
    on('GET', '/api/pickups/:id/session/link/', { body: { member_url: '/x', has_email: true } })
    await renderApp({
      pickupOverrides: { intro_seen: false, visibility: 'creator', has_password: true },
    })
    expect(pageText()).toContain('only the creator can see the folders')
    await next()
    expect(pageText()).toContain('also need the pickup')
    await next()
    expect(pageText()).toContain("Let's go") // no expiry: three pages
    findButton('Close').click() // skipping counts as seen too
    await settle()
    expect(intro()).toHaveLength(1)
  })

  it('opens for the creator only from the account menu', async () => {
    on('GET', '/api/pickups/:id/session/link/', { body: { member_url: '/x', has_email: true } })
    await renderApp({ member: false, creator: true, pickupOverrides: { intro_seen: false } })
    expect(dialog()).toBeNull()
    findButton('Account').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    await flushPromises()
    await chooseMenuItem('How Pickup works')
    await settle()
    expect(pageText()).toContain('This is your folder')
  })
})
