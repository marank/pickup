import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'

import FolderView from '@/features/media/views/FolderView.vue'
import { on, requests } from '@/test/fakeApi'
import { folder, FOLDER_ID, media, PICKUP_ID } from '@/test/factories'
import { findButton, pageText, renderAt, typeCaption } from '@/test/render'

const MEDIA_PATH = `/api/pickups/${PICKUP_ID}/folders/${FOLDER_ID}/media/${media().id}/`

function serve({ owner = true, items = [media({ can_edit: owner })] } = {}) {
  on('GET', '/api/pickups/:p/folders/:f/', { body: folder({ can_edit: owner }) })
  on('GET', '/api/pickups/:p/folders/:f/media/', { body: items })
}

const render = () =>
  renderAt(FolderView, `/pickup/${PICKUP_ID}/folder/${FOLDER_ID}`, {
    pickupId: PICKUP_ID,
    folderId: FOLDER_ID,
  })

afterEach(() => vi.restoreAllMocks())

describe('FolderView', () => {
  it('lets the owner upload and manage media', async () => {
    serve()
    await render()
    expect(pageText()).toContain('Your folder')
    expect(pageText()).toContain('Drop photos and videos here')
    expect(pageText()).toContain('Your media')
    expect(document.querySelector('[data-testid="dropzone"]')).not.toBeNull()
  })

  it('shows other people’s folders read-only', async () => {
    serve({ owner: false })
    await render()
    expect(pageText()).toContain('by Alice')
    expect(pageText()).not.toContain('Drop photos and videos here')
    expect(document.querySelector('button[aria-label^="Delete"]')).toBeNull()
    expect(pageText()).not.toContain('Delete all')
  })

  it('edits a caption', async () => {
    serve()
    on('PATCH', '/api/pickups/:p/folders/:f/media/:m/caption/', { body: media({ caption: 'New' }) })
    const success = vi.spyOn(toast, 'success')
    await render()

    findButton('Edit caption of beach.jpg').click()
    await flushPromises()
    const textarea = document.querySelector<HTMLTextAreaElement>('[role="dialog"] textarea')!
    expect(textarea.value).toBe('Sunset')
    await typeCaption('  New  ')
    findButton('Save').click()
    await flushPromises()

    expect(requests.find((r) => r.method === 'PATCH')).toMatchObject({
      path: `${MEDIA_PATH}caption/`,
      body: { caption: 'New' },
    })
    expect(success).toHaveBeenCalledWith('Caption saved')
  })

  it('reports a failed caption update', async () => {
    serve()
    on('PATCH', '/api/pickups/:p/folders/:f/media/:m/caption/', {
      status: 403,
      body: { error: 'Not yours' },
    })
    const error = vi.spyOn(toast, 'error')
    await render()
    findButton('Edit caption of beach.jpg').click()
    await flushPromises()
    findButton('Save').click()
    await flushPromises()
    expect(error).toHaveBeenCalledWith('Not yours')
  })

  it('deletes a file after confirmation', async () => {
    serve()
    on('DELETE', '/api/pickups/:p/folders/:f/media/:m/', { status: 204 })
    const success = vi.spyOn(toast, 'success')
    await render()

    findButton('Delete beach.jpg').click()
    await flushPromises()
    expect(pageText()).toContain('Delete this file?')
    findButton('Delete').click()
    await flushPromises()

    expect(requests.some((r) => r.method === 'DELETE' && r.path === MEDIA_PATH)).toBe(true)
    expect(success).toHaveBeenCalledWith('beach.jpg deleted')
  })

  it('reports a failed delete', async () => {
    serve()
    on('DELETE', '/api/pickups/:p/folders/:f/media/:m/', { status: 500, body: {} })
    const error = vi.spyOn(toast, 'error')
    await render()
    findButton('Delete beach.jpg').click()
    await flushPromises()
    findButton('Delete').click()
    await flushPromises()
    expect(error).toHaveBeenCalledWith('Could not delete the file')
  })

  it('clears the whole folder after confirmation', async () => {
    serve()
    on('DELETE', '/api/pickups/:p/folders/:f/clear/', {
      body: { message: 'Deleted 1 media files.' },
    })
    const success = vi.spyOn(toast, 'success')
    await render()
    findButton('Delete all').click()
    await flushPromises()
    expect(pageText()).toContain('Delete all files in this folder?')
    const confirm = Array.from(document.querySelectorAll('[role="alertdialog"] button')).find(
      (b) => b.textContent?.trim() === 'Delete all',
    ) as HTMLButtonElement
    confirm.click()
    await flushPromises()
    expect(requests.some((r) => r.path.endsWith('/clear/'))).toBe(true)
    expect(success).toHaveBeenCalledWith('Folder cleared')
  })

  it('reports a failed clear', async () => {
    serve()
    on('DELETE', '/api/pickups/:p/folders/:f/clear/', { status: 403, body: { error: 'Nope' } })
    const error = vi.spyOn(toast, 'error')
    await render()
    findButton('Delete all').click()
    await flushPromises()
    const confirm = Array.from(document.querySelectorAll('[role="alertdialog"] button')).find(
      (b) => b.textContent?.trim() === 'Delete all',
    ) as HTMLButtonElement
    confirm.click()
    await flushPromises()
    expect(error).toHaveBeenCalledWith('Nope')
  })

  it('shows an empty folder', async () => {
    serve({ owner: true, items: [] })
    await render()
    expect(pageText()).toContain('Nothing here yet')
  })

  it('explains unknown folders', async () => {
    on('GET', '/api/pickups/:p/folders/:f/', { status: 404, body: {} })
    on('GET', '/api/pickups/:p/folders/:f/media/', { status: 404, body: {} })
    await render()
    expect(pageText()).toContain('Folder not found')
  })
})
