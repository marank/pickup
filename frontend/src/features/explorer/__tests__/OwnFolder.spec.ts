import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ExplorerView from '@/features/explorer/views/ExplorerView.vue'
import { explorerPath, serveExplorer } from '@/test/explorerData'
import { PICKUP_ID } from '@/test/factories'
import { renderAt } from '@/test/render'

const settle = async () => {
  for (let i = 0; i < 5; i++) await flushPromises()
}
/** Names of the folders that carry the "You" badge, in the tree and in the content. */
const marked = () => {
  const badges = Array.from(document.body.querySelectorAll('[title="Your folder"]'))
  const where = (badge: Element) => (badge.closest('[role="tree"]') ? 'tree' : 'content')
  const name = (badge: Element) =>
    badge.closest('li, tr')?.querySelector('.truncate, .line-clamp-2')?.textContent.trim()
  return badges.map((badge) => `${where(badge)}:${name(badge)}`).sort()
}

describe('own folder', () => {
  it('marks the signed-in member’s folder in the tree and the content', async () => {
    serveExplorer()
    await renderAt(ExplorerView, explorerPath(), { pickupId: PICKUP_ID })
    await settle()
    expect(marked()).toEqual(['content:Alice', 'tree:Alice'])
  })

  it('marks nothing for guests', async () => {
    serveExplorer({ member: false })
    await renderAt(ExplorerView, explorerPath(), { pickupId: PICKUP_ID })
    await settle()
    expect(marked()).toEqual([])
  })
})
