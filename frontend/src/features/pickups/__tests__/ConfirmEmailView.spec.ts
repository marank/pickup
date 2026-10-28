import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import ConfirmEmailView from '@/features/pickups/views/ConfirmEmailView.vue'
import { on, requests } from '@/test/fakeApi'
import { PICKUP_ID } from '@/test/factories'
import { pageText, renderAt } from '@/test/render'

const path = `/pickup/${PICKUP_ID}/confirm-email`

afterEach(() => window.history.replaceState(null, '', '/'))

describe('confirming a new address', () => {
  it('sends the token from after the # and removes it from the address bar', async () => {
    on('POST', '/api/pickups/:id/session/email/confirm/', {
      body: { message: 'Your new address is confirmed.' },
    })
    window.history.replaceState(null, '', `${path}#signed-token`)
    await renderAt(ConfirmEmailView, path, { pickupId: PICKUP_ID })
    await flushPromises()
    expect(requests.find((r) => r.path.endsWith('/confirm/'))?.body).toEqual({
      token: 'signed-token',
    })
    expect(window.location.hash).toBe('')
    expect(pageText()).toContain('Address confirmed')
    expect(pageText()).toContain('Your new address is confirmed.')
  })

  it('says when the link is not valid', async () => {
    on('POST', '/api/pickups/:id/session/email/confirm/', {
      status: 400,
      body: { error: 'This confirmation link is not valid or has expired.' },
    })
    await renderAt(ConfirmEmailView, path, { pickupId: PICKUP_ID })
    await flushPromises()
    expect(pageText()).toContain('Not confirmed')
    expect(pageText()).toContain('has expired')
  })
})
