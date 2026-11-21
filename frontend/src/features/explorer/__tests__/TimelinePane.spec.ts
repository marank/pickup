import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { on } from '@/test/fakeApi'
import { ALICE, BOB, explorerPath, serveExplorer } from '@/test/explorerData'
import { media, PICKUP_ID } from '@/test/factories'
import { findButton, pageText, renderRoute } from '@/test/render'

const settle = async () => {
  for (let i = 0; i < 6; i++) await flushPromises()
}
const timelinePath = `/pickup/${PICKUP_ID}/timeline`
const tiles = () =>
  Array.from(
    document.body.querySelectorAll<HTMLButtonElement>('[data-testid="timeline"] section li button'),
  )
const viewerHeader = () => document.body.querySelector('[role="dialog"] header')?.textContent ?? ''

function serveTimeline(list = shots()) {
  serveExplorer()
  on('GET', '/api/pickups/:id/media/', { body: list })
}

function shots() {
  const shot = (id: string, owner: string, folder: string, taken: string, video = false) =>
    media({
      id,
      folder,
      owner_name: owner,
      original_filename: `${id}.${video ? 'mp4' : 'jpg'}`,
      taken_at: taken,
      is_image: !video,
      is_video: video,
      media_type: video ? 'video' : 'image',
    })
  return [
    shot('a1', 'Alice', ALICE, '2026-06-13T15:00:00'),
    shot('b1', 'Bob', BOB, '2026-06-13T15:10:00'),
    shot('a2', 'Alice', ALICE, '2026-06-13T15:20:00', true),
    shot('b2', 'Bob', BOB, '2026-06-13T21:00:00'),
    shot('a3', 'Alice', ALICE, '2026-06-14T10:00:00'),
  ]
}

afterEach(() => vi.restoreAllMocks())

describe('timeline', () => {
  it('shows everyone by day and moment, filters per person, and opens the viewer across folders', async () => {
    serveTimeline()
    await renderRoute(timelinePath)
    await settle()
    expect(pageText()).toContain('5 photos and videos · by 2 people')
    const days = document.body.querySelectorAll('[data-testid="timeline"] [data-day]')
    expect([...days].map((day) => day.getAttribute('data-day'))).toEqual([
      '2026-06-13',
      '2026-06-14',
    ])
    // 13 June: 15:00 and 21:00 are two moments.
    expect(days[0]!.querySelectorAll('ul')).toHaveLength(2)
    expect(tiles()[2]!.querySelector('svg')).not.toBeNull() // the video has a play mark
    expect(tiles()[1]!.getAttribute('aria-label')).toMatch(/^b1\.jpg, by Bob, /)

    tiles()[1]!.click()
    await settle()
    expect(viewerHeader()).toContain('2 / 5')
    findButton('Next').click()
    await settle()
    expect(viewerHeader()).toContain('3 / 5') // Bob's photo, then Alice's: across folders
    findButton('Close').click()
    await settle()

    Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="group"] [aria-pressed]'))
      .find((chip) => chip.textContent.includes('Bob'))!
      .click()
    await settle()
    expect(pageText()).toContain('2 photos and videos · by 1 person')
    expect(tiles()).toHaveLength(2)
    tiles()[1]!.click()
    await settle()
    expect(viewerHeader()).toContain('2 / 2') // the viewer pages through what is shown
    findButton('Close').click()
    await settle()
    findButton('Show everyone').click()
    await settle()
    expect(tiles()).toHaveLength(5)
  })

  it('is reached from the folders and back with one button', async () => {
    serveTimeline()
    const { router } = await renderRoute(explorerPath())
    await settle()
    findButton('Timeline').click()
    await settle()
    expect(router.currentRoute.value.params.page).toBe('timeline')
    expect(pageText()).toContain('photos and videos')
    document.body
      .querySelector<HTMLButtonElement>('button[aria-pressed="true"][title="Back to the folders"]')!
      .click()
    await settle()
    expect(router.currentRoute.value.name).toBe('explorer')
  })

  it('invites to the own folder while there is nothing yet', async () => {
    serveTimeline([])
    const { router } = await renderRoute(timelinePath)
    await settle()
    expect(pageText()).toContain('No photos yet')
    findButton('Go to my folder').click()
    await settle()
    expect(router.currentRoute.value.params.folderId).toBe(ALICE)
  })
})
