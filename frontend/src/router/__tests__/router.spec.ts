import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import { queryClient } from '@/lib/queryClient'
import router from '@/router'
import { on, requests } from '@/test/fakeApi'
import { pickup, PICKUP_ID } from '@/test/factories'

beforeEach(async () => {
  await router.push('/')
})

describe('router', () => {
  it('trades a personal link for a session and drops the key from the URL', async () => {
    on('POST', '/api/pickups/:id/session/', { body: pickup({ is_creator: true }) })
    await router.push(`/pickup/${PICKUP_ID}/member/secret-key`)
    await flushPromises()

    expect(requests.at(-1)).toMatchObject({
      method: 'POST',
      path: `/api/pickups/${PICKUP_ID}/session/`,
      body: { access_key: 'secret-key' },
    })
    expect(router.currentRoute.value.fullPath).toBe(`/pickup/${PICKUP_ID}`)
    expect(queryClient.getQueryData(['pickup', PICKUP_ID, 'detail'])).toMatchObject({
      is_creator: true,
    })
  })

  it('sends invalid personal links to the join page', async () => {
    on('POST', '/api/pickups/:id/session/', { status: 403, body: { error: 'invalid' } })
    await router.push(`/pickup/${PICKUP_ID}/member/wrong`)
    expect(router.currentRoute.value.name).toBe('pickup-join')
    expect(router.currentRoute.value.query.invalidLink).toBe('1')
  })

  it('removes member ids stored by earlier versions', async () => {
    localStorage.setItem(`pickup_member_${PICKUP_ID}`, 'old-member-id')
    await router.push(`/pickup/${PICKUP_ID}/join`)
    expect(localStorage.getItem(`pickup_member_${PICKUP_ID}`)).toBeNull()
  })

  it('sends unknown paths to the start page', async () => {
    await router.push('/nowhere')
    expect(router.currentRoute.value.name).toBe('home')
  })
})
