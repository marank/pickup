import { describe, expect, it } from 'vitest'

import { pageKey } from '@/router/pageKey'

describe('pageKey', () => {
  it('treats all explorer addresses of a pickup as one page', () => {
    const pickup = { name: 'explorer', params: { pickupId: 'p1' }, path: '/pickup/p1' }
    const folder = { name: 'explorer-folder', params: { pickupId: 'p1', folderId: 'f' }, path: '' }
    const settings = {
      name: 'explorer-page',
      params: { pickupId: 'p1', page: 'settings' },
      path: '',
    }
    expect(pageKey(folder)).toBe(pageKey(pickup))
    expect(pageKey(settings)).toBe(pageKey(pickup))
    expect(pageKey({ ...pickup, params: { pickupId: 'p2' } })).not.toBe(pageKey(pickup))
  })

  it('keys other pages by route name', () => {
    expect(pageKey({ name: 'create', params: {}, path: '/create' })).toBe('create')
    expect(pageKey({ name: 'pickup-join', params: { pickupId: 'p1' }, path: '' })).toBe(
      'pickup-join',
    )
    expect(pageKey({ name: undefined, params: {}, path: '/x' })).toBe('/x')
  })
})
