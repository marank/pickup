import { beforeEach, describe, expect, it } from 'vitest'

import router from '@/router'
import { PICKUP_ID } from '@/test/factories'

beforeEach(async () => {
  await router.push('/')
})

describe('router', () => {
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
