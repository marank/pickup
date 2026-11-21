import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'

import App from '@/App.vue'
import JoinView from '@/features/pickups/views/JoinView.vue'
import { on, requests } from '@/test/fakeApi'
import { explorerPath, serveExplorer } from '@/test/explorerData'
import { folder, pickup, PICKUP_ID } from '@/test/factories'
import { findButton, pageText, renderAt } from '@/test/render'

const settle = async () => {
  for (let i = 0; i < 5; i++) await flushPromises()
}
const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.body.querySelector<T>(selector)!
const lastBody = (method: string, suffix: string) =>
  requests.filter((r) => r.method === method && r.path.endsWith(suffix)).at(-1)?.body

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('password-protected pickups', () => {
  it('asks for the password in the join card and sends it with the join', async () => {
    on('GET', '/api/pickups/:id/', {
      body: pickup({ title: '', can_view: false, password_required: true }),
    })
    on('POST', '/api/pickups/:id/join/', {
      status: 201,
      body: { folder: folder({ can_edit: true }), member_url: '/pickup/x/member/key' },
    })
    const { wrapper } = await renderAt(JoinView, `/pickup/${PICKUP_ID}/join`, {
      pickupId: PICKUP_ID,
    })
    expect(pageText()).toContain('Protected with a password')
    expect(pageText()).toContain('Join this pickup')
    await wrapper.find('#join_password').setValue('summer-24')
    await wrapper.find('#user_name').setValue('Bob')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(lastBody('POST', '/join/')).toEqual({
      user_name: 'Bob',
      name: 'Bob',
      email: '',
      password: 'summer-24',
    })
  })

  it('asks for the password in the login card', async () => {
    on('POST', '/api/pickups/:id/session/preview/', {
      body: { title: 'Party', user_name: 'Bob', is_creator: false, password_required: true },
    })
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    await renderAt(App, `/pickup/${PICKUP_ID}/member/secret-key`)
    await vi.advanceTimersByTimeAsync(2000)
    vi.useRealTimers()
    await settle()

    on('POST', '/api/pickups/:id/session/', { status: 403, body: { error: 'Wrong password.' } })
    const error = vi.spyOn(toast, 'error')
    await new DOMWrapper($<HTMLInputElement>('#link-password')).setValue('wrong')
    $('section[aria-label="Your personal link"] form').dispatchEvent(new Event('submit'))
    await settle()
    expect(lastBody('POST', '/session/')).toEqual({ access_key: 'secret-key', password: 'wrong' })
    expect(error).toHaveBeenCalledWith('Wrong password.')
  })

  it('lets the creator set and remove the password', async () => {
    on('PATCH', '/api/pickups/:id/', { body: pickup() })
    const success = vi.spyOn(toast, 'success')
    serveExplorer({ creator: true, pickupOverrides: { member_name: 'Anna' } })
    await renderAt(App, explorerPath())
    await settle()
    findButton('Settings').click()
    await settle()
    expect(pageText()).toContain('No password set.')

    await new DOMWrapper($<HTMLInputElement>('#settings-password')).setValue('summer-24')
    expect(pageText()).toContain('Saving logs everyone else out of this pickup')
    $('#settings-password').closest('form')!.dispatchEvent(new Event('submit'))
    await settle()
    expect(lastBody('PATCH', `/pickups/${PICKUP_ID}/`)).toEqual({ password: 'summer-24' })
    expect(success).toHaveBeenCalledWith('Password saved')
    expect($<HTMLInputElement>('#settings-password').value).toBe('')
  })

  it('offers to remove a password and notes what it means for "anyone with the link"', async () => {
    on('PATCH', '/api/pickups/:id/', { body: pickup() })
    const success = vi.spyOn(toast, 'success')
    serveExplorer({ creator: true, pickupOverrides: { member_name: 'Anna', has_password: true } })
    await renderAt(App, explorerPath())
    await settle()
    findButton('Settings').click()
    await settle()
    expect(pageText()).toContain('This pickup is protected with a password.')
    expect(pageText()).toContain('With a password, only participants see the photos.')
    findButton('Remove password').click()
    await settle()
    expect(lastBody('PATCH', `/pickups/${PICKUP_ID}/`)).toEqual({ password: '' })
    expect(success).toHaveBeenCalledWith('Password removed')
  })
})
