import { describe, expect, it } from 'vitest'

import {
  fileItem,
  filterItems,
  folderItem,
  sortItems,
  typeLabel,
} from '@/features/explorer/lib/items'
import { buildTree, childrenOf, findByPath, pathTo } from '@/features/explorer/lib/tree'
import { ALICE, aliceMedia, BEACH, BOB, DRONE, folders } from '@/test/explorerData'

const tree = buildTree(folders)

describe('tree', () => {
  it('lists children per folder, sorted by name', () => {
    expect(childrenOf(tree, null).map((f) => f.name)).toEqual(['Alice', "Bob's photos"])
    expect(childrenOf(tree, ALICE).map((f) => f.id)).toEqual([BEACH])
    expect(childrenOf(tree, BEACH)).toEqual([])
  })

  it('knows the path from the top', () => {
    expect(pathTo(tree, DRONE).map((f) => f.id)).toEqual([BOB, DRONE])
    expect(pathTo(tree, null)).toEqual([])
    expect(pathTo(tree, 'unknown')).toEqual([])
  })

  it('resolves typed paths, case-insensitively', () => {
    expect(findByPath(tree, "bob's photos/DRONE SHOTS")?.id).toBe(DRONE)
    expect(findByPath(tree, '/Alice//Beach/')?.id).toBe(BEACH)
    expect(findByPath(tree, '')).toBeNull()
    expect(findByPath(tree, 'Alice/Nope')).toBeUndefined()
  })
})

describe('items', () => {
  const items = [...childrenOf(tree, ALICE).map(folderItem), ...aliceMedia.map(fileItem)]

  it('sorts folders first, then by the chosen key and direction', () => {
    expect(sortItems(items, 'name', 'asc').map((i) => i.name)).toEqual([
      'Beach',
      'apple.jpg',
      'clip.mp4',
      'zebra.jpg',
    ])
    expect(sortItems(items, 'name', 'desc').map((i) => i.name)).toEqual([
      'Beach',
      'zebra.jpg',
      'clip.mp4',
      'apple.jpg',
    ])
    expect(
      sortItems(items, 'size', 'asc')
        .map((i) => i.name)
        .slice(1),
    ).toEqual(['apple.jpg', 'clip.mp4', 'zebra.jpg'])
    expect(
      sortItems(items, 'date', 'desc')
        .map((i) => i.name)
        .slice(1),
    ).toEqual(['apple.jpg', 'clip.mp4', 'zebra.jpg'])
    expect(
      sortItems(items, 'type', 'asc')
        .map((i) => i.name)
        .slice(1),
    ).toEqual(['apple.jpg', 'zebra.jpg', 'clip.mp4'])
    expect(sortItems(items, 'owner', 'asc')[0]!.kind).toBe('folder')
  })

  it('filters by name, owner and caption', () => {
    expect(filterItems(items, 'STRIPES').map((i) => i.name)).toEqual(['zebra.jpg'])
    expect(filterItems(items, 'clip').map((i) => i.name)).toEqual(['clip.mp4'])
    expect(filterItems(items, 'alice')).toHaveLength(4)
    expect(filterItems(items, '  ')).toBe(items)
  })

  it('describes the type', () => {
    expect(typeLabel(items[0]!)).toBe('Folder')
    expect(typeLabel(fileItem(aliceMedia[2]!))).toBe('Video (MP4)')
    expect(typeLabel(fileItem({ ...aliceMedia[0]!, original_filename: 'noext' }))).toBe('Image')
  })
})
