import { describe, expect, it } from 'vitest'

import PickupView from '@/features/pickups/views/PickupView.vue'
import { on } from '@/test/fakeApi'
import { folder, media, pickup, PICKUP_ID } from '@/test/factories'
import { pageText, renderAt } from '@/test/render'

function serve({ isCreator = false, ownsFolder = false } = {}) {
  on('GET', '/api/pickups/:id/', { body: pickup({ is_creator: isCreator }) })
  on('GET', '/api/pickups/:id/folders/', { body: [folder({ can_edit: ownsFolder })] })
  on('GET', '/api/pickups/:id/media/', {
    body: [
      media(),
      media({ id: 'v1', is_image: false, is_video: true, original_filename: 'clip.mp4' }),
    ],
  })
}

const render = () => renderAt(PickupView, `/pickup/${PICKUP_ID}`, { pickupId: PICKUP_ID })

describe('PickupView', () => {
  it('shows the pickup, its folders and all media', async () => {
    serve({ isCreator: true })
    const { wrapper } = await render()
    const text = pageText()
    expect(text).toContain('Summer party')
    expect(text).toContain('Creator')
    expect(text).toContain('Alice photos')
    expect(text).toContain('beach.jpg')
    expect(wrapper.find('video').exists()).toBe(true)
    expect(text).toContain('Join and upload')
    expect((wrapper.find('input[readonly]').element as HTMLInputElement).value).toBe(
      `${window.location.origin}/pickup/${PICKUP_ID}`,
    )
  })

  it('links members to their own folder', async () => {
    serve({ ownsFolder: true })
    await render()
    expect(pageText()).toContain('Your folder')
    expect(pageText()).toContain('Yours')
    expect(pageText()).not.toContain('Join and upload')
  })

  it('opens a preview when a file is clicked', async () => {
    serve()
    const { wrapper } = await render()
    await wrapper.find('button[aria-label="Show beach.jpg"]').trigger('click')
    expect(document.body.querySelector('[role="dialog"] img')?.getAttribute('alt')).toBe('Sunset')
  })

  it('shows empty states', async () => {
    on('GET', '/api/pickups/:id/', { body: pickup({ title: '' }) })
    on('GET', '/api/pickups/:id/folders/', { body: [] })
    on('GET', '/api/pickups/:id/media/', { body: [] })
    await render()
    expect(pageText()).toContain('Untitled pickup')
    expect(pageText()).toContain('No folders yet')
    expect(pageText()).toContain('Nothing has been uploaded yet')
  })

  it('explains unknown pickups', async () => {
    on('GET', '/api/pickups/:id/', { status: 404, body: { detail: 'Not found.' } })
    on('GET', '/api/pickups/:id/folders/', { status: 404, body: {} })
    on('GET', '/api/pickups/:id/media/', { status: 404, body: {} })
    await render()
    expect(pageText()).toContain('Pickup not found')
  })
})
