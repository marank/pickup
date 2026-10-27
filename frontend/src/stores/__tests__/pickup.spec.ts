import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Folder, Media, Pickup } from '@/types'

// Stand-ins for the API functions the code under test calls.
type ApiFn = (...args: unknown[]) => Promise<unknown>
const api = vi.hoisted(() => ({
  pickupApi: {
    getPickup: vi.fn<ApiFn>(),
    enterSession: vi.fn<ApiFn>(),
    joinPickup: vi.fn<ApiFn>(),
    getFolders: vi.fn<ApiFn>(),
    getAllMedia: vi.fn<ApiFn>(),
  },
  folderApi: { getMedia: vi.fn<ApiFn>(), clearFolder: vi.fn<ApiFn>() },
}))
vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  ...api,
}))

const { usePickupStore } = await import('../pickup')

const pickup = (overrides: Partial<Pickup> = {}): Pickup => ({
  id: 'p',
  title: '',
  created_at: '',
  is_active: true,
  share_url: '/pickup/p/',
  folder_count: 0,
  media_count: 0,
  is_creator: false,
  ...overrides,
})
const folder = (id: string, mediaCount = 0): Folder => ({
  id,
  pickup: 'p',
  name: id,
  user_name: id,
  created_at: '',
  media_count: mediaCount,
  can_edit: true,
})
const media = (id: string, folderId: string): Media => ({
  id,
  folder: folderId,
  file: '',
  original_filename: id,
  media_type: 'image',
  file_size: 1,
  file_size_display: '1 B',
  uploaded_at: '',
  caption: '',
  can_edit: true,
  is_image: true,
  is_video: false,
})
const ok = <T>(data: T) => Promise.resolve({ data })
const fail = () => Promise.reject(new Error('down'))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('pickup store', () => {
  it('loads a pickup and knows whether this browser is the creator', async () => {
    api.pickupApi.getPickup.mockReturnValue(ok(pickup({ is_creator: true })))
    const store = usePickupStore()
    await store.loadPickup('p')
    expect(store.isCreator).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('logs in with a personal link and forgets the previous folder', async () => {
    api.pickupApi.enterSession.mockReturnValue(ok(pickup()))
    const store = usePickupStore()
    store.currentFolder = folder('old')
    await store.enterWithKey('p', 'secret')
    expect(api.pickupApi.enterSession).toHaveBeenCalledWith('p', 'secret')
    expect(store.currentFolder).toBeNull()
  })

  it('joins and reloads the pickup for the new member', async () => {
    api.pickupApi.joinPickup.mockReturnValue(ok({ folder: folder('mine'), member_url: '/x' }))
    api.pickupApi.getPickup.mockReturnValue(ok(pickup({ is_creator: false })))
    const store = usePickupStore()
    await store.joinPickup('p', { name: 'mine', user_name: 'Me' })
    expect(store.isAuthenticated).toBe(true)
    expect(store.canEditCurrentFolder).toBe(true)
    expect(store.currentPickup?.is_creator).toBe(false)
  })

  it('loads folders and media, keeps counts in sync', async () => {
    api.pickupApi.getFolders.mockReturnValue(ok([folder('f', 1)]))
    api.pickupApi.getAllMedia.mockReturnValue(ok([media('m1', 'f')]))
    api.folderApi.getMedia.mockReturnValue(ok([media('m1', 'f')]))
    api.folderApi.clearFolder.mockReturnValue(ok({ message: '' }))
    const store = usePickupStore()
    await store.loadFolders('p')
    await store.loadAllMedia('p')
    await store.loadFolderMedia('p', 'f')
    store.currentFolder = store.folders[0]!
    expect(store.currentFolderMedia).toHaveLength(1)

    store.addMedia(media('m2', 'f'))
    expect(store.folders[0]!.media_count).toBe(2)
    store.updateMediaCaption('m2', 'hello')
    expect(store.allMedia.find((m) => m.id === 'm2')?.caption).toBe('hello')
    store.removeMedia('m2')
    expect(store.allMedia).toHaveLength(1)
    expect(store.folders[0]!.media_count).toBe(1)

    await store.clearFolder('p', 'f')
    expect(store.folderMedia).toHaveLength(0)
    expect(store.folders[0]!.media_count).toBe(0)

    store.resetState()
    expect(store.folders).toEqual([])
  })

  it('handles media of folders it does not know', () => {
    const store = usePickupStore()
    expect(store.isCreator).toBe(false)
    expect(store.canEditCurrentFolder).toBe(false)
    store.addMedia(media('m', 'elsewhere'))
    store.updateMediaCaption('unknown', 'x')
    store.removeMedia('m')
    store.removeMedia('unknown')
    expect(store.allMedia).toEqual([])
  })

  it('records an error message and rethrows when a request fails', async () => {
    const store = usePickupStore()
    for (const [mock, action] of [
      [api.pickupApi.getPickup, () => store.loadPickup('p')],
      [api.pickupApi.joinPickup, () => store.joinPickup('p', { name: 'n', user_name: 'u' })],
      [api.pickupApi.getFolders, () => store.loadFolders('p')],
      [api.pickupApi.getAllMedia, () => store.loadAllMedia('p')],
      [api.folderApi.getMedia, () => store.loadFolderMedia('p', 'f')],
      [api.folderApi.clearFolder, () => store.clearFolder('p', 'f')],
    ] as const) {
      mock.mockReturnValueOnce(fail())
      store.clearError()
      await expect(action()).rejects.toThrow('down')
      expect(store.error).toMatch(/^Failed to /)
    }
  })
})
