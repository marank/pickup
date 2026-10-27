import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'

import App from '@/App.vue'
import JoinView from '@/features/pickups/views/JoinView.vue'
import { on, requests } from '@/test/fakeApi'
import { explorerPath, serveExplorer } from '@/test/explorerData'
import { member, pickup, PICKUP_ID } from '@/test/factories'
import { chooseMenuItem, findButton, pageText, renderAt } from '@/test/render'

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.body.querySelector<T>(selector)!
const type = (selector: string, value: string) => new DOMWrapper($(selector)).setValue(value)
const settle = async () => {
  for (let i = 0; i < 5; i++) await flushPromises()
}
const submit = async (selector: string) => {
  $(selector)
    .closest('form')!
    .dispatchEvent(new Event('submit', { bubbles: true }))
  await settle()
}
const lastRequest = (method: string, suffix: string) =>
  requests.filter((r) => r.method === method && r.path.endsWith(suffix)).at(-1)

const renderJoin = (overrides: Parameters<typeof pickup>[0]) => {
  on('GET', '/api/pickups/:id/', { body: pickup(overrides) })
  return renderAt(JoinView, `/pickup/${PICKUP_ID}/join`, { pickupId: PICKUP_ID })
}

async function renderAsCreator(pickupOverrides: Parameters<typeof pickup>[0] = {}) {
  serveExplorer({ creator: true, pickupOverrides: { member_name: 'Anna', ...pickupOverrides } })
  const result = await renderAt(App, explorerPath())
  await settle()
  return result
}

afterEach(() => vi.restoreAllMocks())

describe('joining by policy', () => {
  it('lets strangers only ask for their link when the pickup is invite-only', async () => {
    on('POST', '/api/pickups/:id/link-request/', {
      status: 202,
      body: { message: 'If this address belongs to this pickup, we sent the link.' },
    })
    await renderJoin({ join_policy: 'invite', can_view: false })
    expect(pageText()).toContain('Only invited people can take part')
    expect(document.body.querySelector('#user_name')).toBeNull()

    await type('input[aria-label="Your email"]', ' bob@example.com ')
    await submit('input[aria-label="Your email"]')
    expect(lastRequest('POST', '/link-request/')?.body).toEqual({ email: 'bob@example.com' })
    expect($('[role="status"]').textContent).toContain('we sent the link')
  })

  it('reports a rejected link request', async () => {
    on('POST', '/api/pickups/:id/link-request/', { status: 400, body: { email: ['Invalid.'] } })
    const error = vi.spyOn(toast, 'error')
    await renderJoin({ join_policy: 'closed' })
    expect(pageText()).toContain("doesn't take new participants")
    await type('input[aria-label="Your email"]', 'x@example.com')
    await submit('input[aria-label="Your email"]')
    expect(error).toHaveBeenCalled()
  })

  it('asks an invited person for their name, prefilled from the invitation', async () => {
    await renderJoin({ join_policy: 'invite', is_member: true, member_name: 'Mark' })
    expect(pageText()).toContain('Choose your name')
    expect(($('#user_name') as HTMLInputElement).value).toBe('Mark')
    expect(pageText()).not.toContain('Already part of it on another device?')
  })

  it('does not prefill the placeholder name of the creator', async () => {
    await renderJoin({ is_creator: true, is_member: true, member_name: 'Creator' })
    expect(($('#user_name') as HTMLInputElement).value).toBe('')
  })
})

describe('creator tools', () => {
  it('opens settings and people as pages from the tree and the account menu', async () => {
    const { router } = await renderAsCreator()
    const pickupNav = $('nav[aria-label="Pickup"]')
    expect(pickupNav.textContent).toContain('People')
    findButton('Settings').click()
    await settle()
    expect(router.currentRoute.value.fullPath).toBe(`/pickup/${PICKUP_ID}/settings`)
    expect($('[aria-current="location"]').textContent).toContain('Settings')
    expect($('[aria-current="page"]').textContent).toContain('Settings')
    expect(document.body.querySelector('[role="toolbar"][aria-label="Commands"]')).toBeNull()
    expect(findButton('Up one level').disabled).toBe(false)

    findButton('Account').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    await flushPromises()
    await chooseMenuItem('People & invitations')
    await settle()
    expect(router.currentRoute.value.fullPath).toBe(`/pickup/${PICKUP_ID}/people`)
    expect(pageText()).toContain('Invite by email')

    findButton('Up one level').click()
    await settle()
    expect(router.currentRoute.value.name).toBe('explorer')
  })

  it('shows the pages only to the creator', async () => {
    serveExplorer()
    await renderAt(App, `/pickup/${PICKUP_ID}/settings`)
    await settle()
    expect(document.body.querySelector('nav[aria-label="Pickup"]')).toBeNull()
    expect(pageText()).toContain('Only the creator of this pickup can open this.')
  })

  it('changes the settings and warns before addresses are deleted', async () => {
    on('PATCH', '/api/pickups/:id/', { body: pickup() })
    const success = vi.spyOn(toast, 'success')
    await renderAsCreator({ email_privacy: false })
    findButton('Settings').click()
    await settle()
    expect(($('#settings-title') as HTMLInputElement).value).toBe('Summer party')
    expect(findButton('Save changes').disabled).toBe(true)

    await type('#settings-title', ' Sommerfest ')
    $<HTMLInputElement>('input[name="visibility"][value="link"]').click()
    $<HTMLInputElement>('input[name="join_policy"][value="invite"]').click()
    $<HTMLInputElement>('form[aria-label="Pickup settings"] input[type="checkbox"]').click()
    await flushPromises()
    expect(pageText()).toContain('Saving deletes all stored addresses')
    findButton('Discard').click()
    await flushPromises()
    expect(($('#settings-title') as HTMLInputElement).value).toBe('Summer party')
    await type('#settings-title', ' Sommerfest ')
    $<HTMLInputElement>('input[name="visibility"][value="link"]').click()
    $<HTMLInputElement>('input[name="join_policy"][value="invite"]').click()
    $<HTMLInputElement>('form[aria-label="Pickup settings"] input[type="checkbox"]').click()
    await flushPromises()

    await submit('#settings-title')
    expect(lastRequest('PATCH', `/pickups/${PICKUP_ID}/`)?.body).toEqual({
      title: 'Sommerfest',
      visibility: 'link',
      join_policy: 'invite',
      email_privacy: true,
    })
    expect(success).toHaveBeenCalledWith('Settings saved')
  })

  it('reports failed settings', async () => {
    on('PATCH', '/api/pickups/:id/', { status: 500, body: {} })
    const error = vi.spyOn(toast, 'error')
    await renderAsCreator()
    findButton('Settings').click()
    await settle()
    await submit('#settings-title')
    expect(error).toHaveBeenCalledWith('Could not save the settings')
  })

  it('invites, resends and removes people', async () => {
    on('GET', '/api/pickups/:p/members/', {
      body: [
        member({ id: 'm-anna', user_name: 'Anna', is_creator: true, is_you: true }),
        member({
          id: 'm-mark',
          user_name: 'Mark',
          has_folder: false,
          folder: null,
          invited: true,
          has_email: true,
          email: 'mark@example.com',
        }),
        member({ id: 'm-bob', has_email: true }),
      ],
    })
    on('POST', '/api/pickups/:p/members/', { status: 201, body: member({ id: 'm-new' }) })
    on('POST', '/api/pickups/:p/members/:m/resend/', { status: 202, body: { message: 'ok' } })
    on('DELETE', '/api/pickups/:p/members/:m/', { status: 204 })
    const success = vi.spyOn(toast, 'success')
    await renderAsCreator({ email_privacy: false, join_policy: 'invite' })
    findButton('People').click()
    await settle()

    const list = $('ul[aria-label="Participants"]').textContent!.replace(/\s+/g, ' ')
    expect(list).toContain('Anna (you)')
    expect(list).toContain('Invited, not joined yet · mark@example.com')
    expect(list).toContain('Member · email stored privately')
    expect(pageText()).toContain('Only people you invite can take part')
    expect(pageText()).toContain('from “Anna via Pickup”')
    expect(document.body.querySelector('button[aria-label="Remove Anna"]')).toBeNull()

    await type('#invite-email', 'lena@example.com')
    await type('#invite-name', 'Lena')
    await submit('#invite-email')
    expect(lastRequest('POST', '/members/')?.body).toEqual({
      email: 'lena@example.com',
      name: 'Lena',
    })
    expect(success).toHaveBeenCalledWith('Invitation sent to lena@example.com')

    findButton('Send the invitation to Mark again').click()
    await settle()
    expect(lastRequest('POST', '/m-mark/resend/')).toBeDefined()

    findButton('Remove Bob').click()
    await settle()
    expect(pageText()).toContain('their folder with everything in it is deleted')
    Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'))
      .find((button) => button.textContent?.trim() === 'Remove')!
      .click()
    await settle()
    expect(lastRequest('DELETE', '/members/m-bob/')).toBeDefined()
    expect(success).toHaveBeenCalledWith('Bob removed')
  })

  it('reports failed invitations', async () => {
    on('GET', '/api/pickups/:p/members/', { body: [member({ email: 'bob@example.com' })] })
    on('POST', '/api/pickups/:p/members/', { status: 400, body: { email: ['Invalid.'] } })
    on('POST', '/api/pickups/:p/members/:m/resend/', { status: 429, body: {} })
    on('DELETE', '/api/pickups/:p/members/:m/', { status: 500, body: {} })
    const error = vi.spyOn(toast, 'error')
    await renderAsCreator()
    findButton('People').click()
    await settle()
    await type('#invite-email', 'nope@example.com')
    await submit('#invite-email')
    findButton('Send the invitation to Bob again').click()
    await settle()
    findButton('Remove Bob').click()
    await settle()
    Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'))
      .find((button) => button.textContent?.trim() === 'Remove')!
      .click()
    await settle()
    expect(error).toHaveBeenCalledWith('Could not remove')
    expect(error).toHaveBeenCalledTimes(3)
  })
})

describe('personal link by email', () => {
  it('mails a member their link from the account menu', async () => {
    on('POST', '/api/pickups/:id/session/email/', { status: 202, body: { message: 'Sent.' } })
    const success = vi.spyOn(toast, 'success')
    serveExplorer()
    await renderAt(App, explorerPath())
    await settle()
    findButton('Account').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    await flushPromises()
    await chooseMenuItem('Email me my personal link')
    expect(pageText()).toContain('stored only as an unreadable fingerprint')
    await type('#own-email', 'alice@example.com')
    await submit('#own-email')
    expect(lastRequest('POST', '/session/email/')?.body).toEqual({ email: 'alice@example.com' })
    expect(success).toHaveBeenCalledWith('Check your inbox for your personal link')
  })

  it('reports a failed mail', async () => {
    on('POST', '/api/pickups/:id/session/email/', { status: 429, body: {} })
    const error = vi.spyOn(toast, 'error')
    serveExplorer()
    await renderAt(App, explorerPath())
    await settle()
    findButton('Account').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    await flushPromises()
    await chooseMenuItem('Email me my personal link')
    await type('#own-email', 'alice@example.com')
    await submit('#own-email')
    expect(error).toHaveBeenCalledWith('Could not send the mail')
  })
})
