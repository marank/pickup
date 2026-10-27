import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Stand-ins for the API functions the code under test calls.
type ApiFn = (...args: unknown[]) => Promise<unknown>
const api = vi.hoisted(() => ({
  pickupApi: { getPickup: vi.fn<ApiFn>(), enterSession: vi.fn<ApiFn>() },
}))
vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  ...api,
}))

const { default: router } = await import('../index')
const pickup = { id: 'p1', is_creator: true }

beforeEach(async () => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  await router.push('/')
})

describe('router guard', () => {
  it('exchanges the personal link for a session and drops the key from the URL', async () => {
    api.pickupApi.enterSession.mockResolvedValue({ data: pickup })
    await router.push('/pickup/p1/member/secret-key')
    expect(api.pickupApi.enterSession).toHaveBeenCalledWith('p1', 'secret-key')
    expect(router.currentRoute.value.fullPath).toBe('/pickup/p1')
  })

  it('sends invalid personal links to the join page', async () => {
    api.pickupApi.enterSession.mockRejectedValue(new Error('403'))
    await router.push('/pickup/p1/member/wrong')
    expect(router.currentRoute.value.name).toBe('pickup-join')
  })

  it('loads the pickup for pickup and folder routes, and removes old stored member ids', async () => {
    localStorage.setItem('pickup_member_p1', 'old-member-id')
    api.pickupApi.getPickup.mockResolvedValue({ data: pickup })
    await router.push('/pickup/p1/folder/f1')
    expect(api.pickupApi.getPickup).toHaveBeenCalledWith('p1')
    expect(localStorage.getItem('pickup_member_p1')).toBeNull()
    expect(router.currentRoute.value.name).toBe('folder')
  })

  it('sends unknown pickups to the join page', async () => {
    api.pickupApi.getPickup.mockRejectedValue(new Error('404'))
    await router.push('/pickup/missing')
    expect(router.currentRoute.value.name).toBe('pickup-join')
  })
})
