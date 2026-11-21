/** A small pickup for explorer tests: Alice (this browser) and Bob, with subfolders. */
import { on } from './fakeApi'
import type { Folder } from '@/api/types'
import type { components } from '@/api/schema'

import { folder, media, pickup, PICKUP_ID } from './factories'

type Pickup = components['schemas']['Pickup']

export const ALICE = 'aaaaaaaa-0000-4000-8000-000000000001'
export const BEACH = 'aaaaaaaa-0000-4000-8000-000000000002'
export const BOB = 'bbbbbbbb-0000-4000-8000-000000000001'
export const DRONE = 'bbbbbbbb-0000-4000-8000-000000000002'

export const folders = [
  folder({
    id: ALICE,
    name: 'Alice',
    user_name: 'Alice',
    can_edit: true,
    subfolder_count: 1,
    media_count: 3,
  }),
  folder({
    id: BEACH,
    name: 'Beach',
    user_name: 'Alice',
    parent: ALICE,
    root: ALICE,
    can_edit: true,
    media_count: 1,
  }),
  folder({ id: BOB, name: "Bob's photos", user_name: 'Bob', subfolder_count: 1, media_count: 0 }),
  folder({
    id: DRONE,
    name: 'Drone shots',
    user_name: 'Bob',
    parent: BOB,
    root: BOB,
    media_count: 0,
  }),
]

export const aliceMedia = [
  media({
    id: 'm-zebra',
    folder: ALICE,
    original_filename: 'zebra.jpg',
    file_size: 3000,
    caption: 'Stripes',
    can_edit: true,
    uploaded_at: '2026-10-01T10:00:00Z',
  }),
  media({
    id: 'm-apple',
    folder: ALICE,
    original_filename: 'apple.jpg',
    file_size: 1000,
    caption: '',
    can_edit: true,
    uploaded_at: '2026-10-03T10:00:00Z',
  }),
  media({
    id: 'm-clip',
    folder: ALICE,
    original_filename: 'clip.mp4',
    file_size: 2000,
    caption: 'Party',
    can_edit: true,
    is_image: false,
    is_video: true,
    media_type: 'video',
    uploaded_at: '2026-10-02T10:00:00Z',
  }),
]

/**
 * Serve the pickup. `member` false: this browser hasn't joined (nothing is editable);
 * `creator`: signed in as the creator (without a folder unless `member`), who may delete
 * everything but the top-level folders; `pickupOverrides` for settings such as visibility.
 */
export function serveExplorer({
  member = true,
  creator = false,
  readOnly = false,
  pickupOverrides = {},
}: {
  member?: boolean
  creator?: boolean
  readOnly?: boolean
  pickupOverrides?: Partial<Pickup>
} = {}) {
  const ownsFolder = (f: Folder) => member && f.user_name === 'Alice'
  const list = folders.map((f) => ({
    ...f,
    can_edit: ownsFolder(f) && !readOnly,
    is_own: ownsFolder(f),
    can_delete: f.parent !== null && ((ownsFolder(f) && !readOnly) || creator),
  }))
  const editable = member && !readOnly
  const files = aliceMedia.map((m) => ({
    ...m,
    can_edit: editable,
    can_delete: editable || creator,
  }))
  const signedIn = member || creator
  on('GET', '/api/pickups/:id/', {
    body: pickup({
      title: 'Summer party',
      is_creator: creator,
      is_member: signedIn,
      has_folder: member,
      member_name: member ? 'Alice' : creator ? 'Creator' : '',
      folder_count: 4,
      media_count: 4,
      is_read_only: readOnly,
      ...pickupOverrides,
    }),
  })
  on('GET', '/api/pickups/:id/folders/', { body: list })
  on('GET', '/api/pickups/:p/folders/:f/media/', (_request, { f }) => ({
    body:
      f === ALICE
        ? files
        : f === BEACH
          ? [
              media({
                id: 'm-beach',
                folder: BEACH,
                original_filename: 'wave.jpg',
                can_edit: member,
                can_delete: member || creator,
              }),
            ]
          : [],
  }))
}

export const explorerPath = (folderId?: string) =>
  folderId ? `/pickup/${PICKUP_ID}/f/${folderId}` : `/pickup/${PICKUP_ID}`
