import { VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { toast } from 'vue-sonner'

import {
  CHUNK_SIZE,
  DIRECT_UPLOAD_MAX_SIZE,
  useUploadQueue,
} from '@/features/media/composables/useUploadQueue'
import { queryClient } from '@/lib/queryClient'
import { on, requests } from '@/test/fakeApi'
import { FOLDER_ID, media, PICKUP_ID } from '@/test/factories'

function setup() {
  let queue!: ReturnType<typeof useUploadQueue>
  mount(
    defineComponent({
      setup() {
        queue = useUploadQueue(PICKUP_ID, FOLDER_ID, { retryDelayMs: 0 })
        return () => null
      },
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient }]] } },
  )
  return queue
}

const small = () => new File(['jpeg'], 'beach.jpg', { type: 'image/jpeg' })
// Just above the direct limit: three chunks of 5 MB, 5 MB, 10 MB + 1 byte... rounded by CHUNK_SIZE.
const large = () =>
  new File([new Uint8Array(DIRECT_UPLOAD_MAX_SIZE + 1)], 'movie.mp4', { type: 'video/mp4' })
const chunkCount = Math.ceil((DIRECT_UPLOAD_MAX_SIZE + 1) / CHUNK_SIZE)

function serveChunked(chunk: Parameters<typeof on>[2] = { body: {} }) {
  on('POST', '/api/pickups/:p/folders/:f/upload-sessions/', {
    status: 201,
    body: { id: 'session-1' },
  })
  on('POST', '/api/upload-sessions/:s/chunks/', chunk)
  on('POST', '/api/upload-sessions/:s/finalize/', {
    status: 201,
    body: media({ original_filename: 'movie.mp4' }),
  })
}

afterEach(() => vi.restoreAllMocks())

describe('useUploadQueue', () => {
  it('uploads small files in one request and refreshes the pickup', async () => {
    on('POST', '/api/pickups/:p/folders/:f/media/', { status: 201, body: media() })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const queue = setup()

    await queue.add(small(), 'Sunset')

    expect(queue.items.value[0]).toMatchObject({ status: 'done', progress: 100, chunked: false })
    expect(requests.at(-1)?.path).toBe(`/api/pickups/${PICKUP_ID}/folders/${FOLDER_ID}/media/`)
    expect(requests.at(-1)?.csrf).toBe('test-token')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pickup', PICKUP_ID] })
    expect(queue.busy.value).toBe(false)
  })

  it('uploads large files in chunks and finalizes them', async () => {
    serveChunked()
    const queue = setup()
    await queue.add(large())

    const paths = requests.map((r) => r.path)
    expect(paths.filter((p) => p.endsWith('/chunks/'))).toHaveLength(chunkCount)
    expect(paths.at(-1)).toBe('/api/upload-sessions/session-1/finalize/')
    expect(requests.find((r) => r.path.endsWith('/upload-sessions/'))?.body).toMatchObject({
      file_name: 'movie.mp4',
      chunk_size: CHUNK_SIZE,
    })
    expect(queue.items.value[0]).toMatchObject({ status: 'done', chunked: true })
  })

  it('retries a failed chunk and gives up after three attempts', async () => {
    let calls = 0
    serveChunked(() => (++calls === 1 ? { status: 502, body: {} } : { body: {} }))
    const queue = setup()
    await queue.add(large())
    expect(queue.items.value[0]!.status).toBe('done')
    expect(calls).toBe(chunkCount + 1)

    requests.length = 0
    serveChunked({ status: 500, body: { error: 'Disk full' } })
    const error = vi.spyOn(toast, 'error')
    await queue.add(large())
    expect(requests.filter((r) => r.path.endsWith('/chunks/'))).toHaveLength(3)
    expect(queue.items.value[1]).toMatchObject({ status: 'error', error: 'Disk full' })
    expect(error).toHaveBeenCalledWith('movie.mp4: Disk full')
  })

  it('retries a failed upload on request', async () => {
    let fail = true
    on('POST', '/api/pickups/:p/folders/:f/media/', () =>
      fail ? { status: 400, body: { file: ['Bad file'] } } : { status: 201, body: media() },
    )
    const queue = setup()
    await queue.add(small())
    const item = queue.items.value[0]!
    expect(item).toMatchObject({ status: 'error', error: 'Bad file' })

    fail = false
    await queue.retry(item)
    expect(item.status).toBe('done')
  })

  it('cancels waiting and running uploads', async () => {
    let release!: () => void
    on(
      'POST',
      '/api/pickups/:p/folders/:f/media/',
      () =>
        new Promise((resolve) => {
          release = () => resolve({ status: 201, body: media() })
        }),
    )
    const queue = setup()
    const first = queue.add(small())
    const second = queue.add(small())
    await flushPromises()
    const [running, waiting] = queue.items.value
    expect(running!.status).toBe('uploading')
    expect(queue.busy.value).toBe(true)

    queue.cancel(waiting!)
    queue.cancel(running!)
    release()
    await Promise.all([first, second])
    expect(running!.status).toBe('cancelled')
    expect(waiting!.status).toBe('cancelled')
    expect(requests.filter((r) => r.path.endsWith('/media/'))).toHaveLength(1)

    queue.clearFinished()
    expect(queue.items.value).toEqual([])
  })
})
