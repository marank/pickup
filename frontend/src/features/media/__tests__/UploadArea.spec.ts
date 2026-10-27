import { flushPromises, mount } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'

import UploadArea from '@/features/media/components/UploadArea.vue'
import { queryClient } from '@/lib/queryClient'
import { on, requests } from '@/test/fakeApi'
import { FOLDER_ID, media, PICKUP_ID } from '@/test/factories'
import { findButton, pageText, typeCaption } from '@/test/render'

beforeEach(() => {
  URL.createObjectURL = vi.fn<(file: Blob) => string>(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn<(url: string) => void>()
  on('POST', '/api/pickups/:p/folders/:f/media/', { status: 201, body: media() })
})
afterEach(() => vi.restoreAllMocks())

function render() {
  return mount(UploadArea, {
    props: { pickupId: PICKUP_ID, folderId: FOLDER_ID },
    attachTo: document.body,
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
}

function selectFiles(wrapper: ReturnType<typeof render>, files: File[]) {
  const input = wrapper.find('[data-testid="file-input"]')
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  return input.trigger('change')
}

const photo = (name = 'beach.jpg') => new File(['x'], name, { type: 'image/jpeg' })

describe('UploadArea', () => {
  it('asks for a caption per file, then uploads', async () => {
    const wrapper = render()
    await selectFiles(wrapper, [
      photo('one.jpg'),
      new File(['x'], 'clip.mp4', { type: 'video/mp4' }),
    ])
    await flushPromises()
    expect(pageText()).toContain('Caption for one.jpg')

    await typeCaption('First')
    findButton('Upload').click()
    await flushPromises()

    expect(pageText()).toContain('Caption for clip.mp4')
    expect(document.querySelector<HTMLTextAreaElement>('[role="dialog"] textarea')!.value).toBe('')
    expect(document.querySelector('[role="dialog"] video')).not.toBeNull()
    findButton('Upload without caption').click()
    await flushPromises()

    const uploads = requests.filter((r) => r.path.endsWith('/media/'))
    expect(uploads).toHaveLength(2)
    expect(String(uploads[0]!.body)).toContain('First')
    expect(pageText()).toContain('Uploads')
    expect(pageText()).toContain('Done')
    wrapper.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('accepts dropped files and rejects other types', async () => {
    const error = vi.spyOn(toast, 'error')
    const wrapper = render()
    const dropzone = wrapper.find('[data-testid="dropzone"]')
    await dropzone.trigger('dragenter')
    expect(dropzone.classes()).toContain('border-primary')
    await dropzone.trigger('dragleave')
    await dropzone.trigger('drop', {
      dataTransfer: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' }), photo()] },
    })
    await flushPromises()
    expect(error).toHaveBeenCalledWith('notes.txt is not an image or video')
    expect(pageText()).toContain('Caption for beach.jpg')
  })

  it('ignores a selection without media and lets uploads be retried or cleared', async () => {
    on('POST', '/api/pickups/:p/folders/:f/media/', { status: 400, body: { file: ['Too big'] } })
    const wrapper = render()
    await selectFiles(wrapper, [new File(['x'], 'a.pdf', { type: 'application/pdf' })])
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    await selectFiles(wrapper, [photo()])
    await flushPromises()
    findButton('Upload').click()
    await flushPromises()
    expect(pageText()).toContain('Too big')

    on('POST', '/api/pickups/:p/folders/:f/media/', { status: 201, body: media() })
    findButton('Retry').click()
    await flushPromises()
    expect(pageText()).toContain('Done')
    findButton('Clear finished').click()
    await flushPromises()
    expect(pageText()).not.toContain('Uploads')
  })
})
