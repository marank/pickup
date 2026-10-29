import { useQueryClient } from '@tanstack/vue-query'
import { computed, reactive, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { toast } from 'vue-sonner'

import { api, formBody } from '@/api/client'
import { apiErrorMessage, unwrap } from '@/api/errors'
import type { Media, UploadChunkRequest, UploadMediaRequest } from '@/api/types'
import { pickupKeys } from '@/features/pickups/queryKeys'

export const CHUNK_SIZE = 5 * 1024 * 1024
// Above this, files go up in chunks; must stay below nginx client_max_body_size (25m).
export const DIRECT_UPLOAD_MAX_SIZE = 20 * 1024 * 1024
const MAX_CHUNK_ATTEMPTS = 3

type UploadStatus = 'pending' | 'uploading' | 'done' | 'error' | 'cancelled'

export interface UploadItem {
  id: number
  file: File
  /** Target folder; uploads keep going while the user browses elsewhere. */
  folderId: string
  caption: string
  chunked: boolean
  status: UploadStatus
  /** 0-100; chunked uploads advance per chunk, direct ones jump at the end. */
  progress: number
  error?: string
  controller?: AbortController
}

interface Options {
  /** Wait before retrying a failed chunk, per attempt (tests pass 0). */
  retryDelayMs?: number
}

/** Uploads files one after another, directly or in chunks; one queue per pickup. */
export function useUploadQueue(
  pickupId: MaybeRefOrGetter<string>,
  { retryDelayMs = 1000 }: Options = {},
) {
  const client = useQueryClient()
  const items = ref<UploadItem[]>([])
  let nextId = 1
  let queue = Promise.resolve()

  const busy = computed(() =>
    items.value.some((item) => item.status === 'pending' || item.status === 'uploading'),
  )

  const folderPath = (item: UploadItem) => ({
    path: { pickup_id: toValue(pickupId), id: item.folderId },
  })

  async function uploadDirect(item: UploadItem, signal: AbortSignal): Promise<Media> {
    return unwrap(
      api.POST('/api/pickups/{pickup_id}/folders/{id}/media/', {
        params: folderPath(item),
        ...formBody<UploadMediaRequest>({ file: item.file, caption: item.caption || undefined }),
        signal,
      }),
    )
  }

  async function uploadChunked(item: UploadItem, signal: AbortSignal): Promise<Media> {
    const session = await unwrap(
      api.POST('/api/pickups/{pickup_id}/folders/{folder_id}/upload-sessions/', {
        params: { path: { pickup_id: toValue(pickupId), folder_id: item.folderId } },
        body: {
          file_name: item.file.name,
          file_size: item.file.size,
          chunk_size: CHUNK_SIZE,
          caption: item.caption,
        },
        signal,
      }),
    )
    const sessionPath = { path: { session_id: session.id } }
    const total = Math.ceil(item.file.size / CHUNK_SIZE)

    for (let index = 0; index < total; index++) {
      const chunk = item.file.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
      for (let attempt = 1; ; attempt++) {
        try {
          await unwrap(
            api.POST('/api/upload-sessions/{session_id}/chunks/', {
              params: sessionPath,
              ...formBody<UploadChunkRequest>({ chunk_index: String(index), chunk }),
              signal,
            }),
          )
          break
        } catch (err) {
          if (signal.aborted || attempt >= MAX_CHUNK_ATTEMPTS) throw err
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt))
        }
      }
      item.progress = Math.round(((index + 1) / total) * 100)
    }

    return unwrap(
      api.POST('/api/upload-sessions/{session_id}/finalize/', { params: sessionPath, signal }),
    )
  }

  async function upload(item: UploadItem): Promise<void> {
    if (item.status !== 'pending') return // cancelled while waiting
    const controller = new AbortController()
    Object.assign(item, { status: 'uploading', progress: 0, error: undefined, controller })
    try {
      // Done shows in the upload list; no toast per file.
      await (item.chunked
        ? uploadChunked(item, controller.signal)
        : uploadDirect(item, controller.signal))
      Object.assign(item, { status: 'done', progress: 100 })
      await client.invalidateQueries({ queryKey: pickupKeys.all(toValue(pickupId)) })
    } catch (err) {
      if (controller.signal.aborted) {
        item.status = 'cancelled'
        return
      }
      Object.assign(item, { status: 'error', error: apiErrorMessage(err, 'Upload failed') })
      toast.error(`${item.file.name}: ${item.error}`)
    }
  }

  function enqueue(item: UploadItem) {
    queue = queue.then(() => upload(item))
    return queue
  }

  function add(file: File, folderId: string, caption = '') {
    const item = reactive<UploadItem>({
      id: nextId++,
      file,
      folderId,
      caption,
      chunked: file.size > DIRECT_UPLOAD_MAX_SIZE,
      status: 'pending',
      progress: 0,
    })
    items.value.push(item)
    return enqueue(item)
  }

  function retry(item: UploadItem) {
    item.status = 'pending'
    return enqueue(item)
  }

  function cancel(item: UploadItem) {
    if (item.status === 'pending') item.status = 'cancelled'
    item.controller?.abort()
  }

  function clearFinished() {
    items.value = items.value.filter(
      (item) => item.status === 'pending' || item.status === 'uploading',
    )
  }

  const finished = computed(() => items.value.filter((item) => item.status === 'done').length)

  return { items, busy, finished, add, retry, cancel, clearFinished }
}
