import type { CreatedPickup, Folder, Media } from '@/api/types'
import type { components } from '@/api/schema'

type Pickup = components['schemas']['Pickup']

export const PICKUP_ID = '11111111-1111-4111-8111-111111111111'
export const FOLDER_ID = '22222222-2222-4222-8222-222222222222'

export function pickup(overrides: Partial<Pickup> = {}): Pickup {
  return {
    id: PICKUP_ID,
    title: 'Summer party',
    created_at: '2026-10-27T10:00:00Z',
    is_active: true,
    share_url: `/pickup/${PICKUP_ID}/`,
    folder_count: 1,
    media_count: 1,
    is_creator: false,
    ...overrides,
  }
}

export function createdPickup(): CreatedPickup {
  return { ...pickup({ is_creator: true }), member_url: `/pickup/${PICKUP_ID}/member/secret-key` }
}

export function folder(overrides: Partial<Folder> = {}): Folder {
  return {
    id: FOLDER_ID,
    pickup: PICKUP_ID,
    name: 'Alice photos',
    user_name: 'Alice',
    created_at: new Date().toISOString(),
    media_count: 1,
    can_edit: false,
    ...overrides,
  }
}

export function media(overrides: Partial<Media> = {}): Media {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    folder: FOLDER_ID,
    file: '/media/2026/10/27/abc.jpg',
    original_filename: 'beach.jpg',
    media_type: 'image',
    file_size: 2048,
    file_size_display: '2.0 KB',
    uploaded_at: '2026-10-27T10:00:00Z',
    caption: 'Sunset',
    can_edit: false,
    is_image: true,
    is_video: false,
    ...overrides,
  }
}
