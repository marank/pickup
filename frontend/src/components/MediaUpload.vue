<template>
  <div class="media-upload">
    <div
      class="upload-area"
      :class="{ 'drag-over': isDragOver, 'uploading': hasActiveUploads }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*,video/*"
        @change="handleFileSelect"
        class="file-input"
      />
      
      <div class="upload-content">
        <div class="upload-icon">📤</div>
        <h3>Upload Media</h3>
        <p>Drag and drop images or videos here, or click to browse</p>
        <p class="upload-hint">
          Supports all image/video formats. Large files use chunked upload (up to 10s of GB)
        </p>
        
        <button @click="fileInput?.click()" class="browse-btn" :disabled="hasActiveUploads">
          {{ hasActiveUploads ? 'Uploading...' : 'Browse Files' }}
        </button>
      </div>
      
      <!-- Upload Progress -->
      <div v-if="uploadQueue.length > 0" class="upload-progress">
        <h4>Uploads</h4>
        <div class="progress-list">
          <div
            v-for="item in uploadQueue"
            :key="item.id"
            class="progress-item"
            :class="{ 'completed': item.status === 'completed', 'error': item.status === 'error' }"
          >
            <div class="progress-info">
              <div class="file-info">
                <span class="filename">{{ item.file.name }}</span>
                <span class="file-size">{{ formatFileSize(item.file.size) }}</span>
                <span v-if="item.useChunks" class="chunk-badge">chunked</span>
              </div>
              <div class="status-actions">
                <span class="status">{{ getStatusText(item) }}</span>
                <button
                  v-if="item.status === 'error'"
                  @click="retryUpload(item)"
                  class="retry-btn"
                >
                  Retry
                </button>
                <button
                  v-if="item.status === 'uploading'"
                  @click="cancelUpload(item)"
                  class="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div v-if="item.status === 'uploading' || item.status === 'paused'" class="progress-bar">
              <div class="progress-fill" :style="{ width: item.progress + '%' }"></div>
            </div>
            <div v-if="item.error" class="error-text">{{ item.error }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Caption Input Modal -->
    <div v-if="showCaptionModal" class="caption-modal" @click="closeCaptionModal">
      <div class="modal-content" @click.stop>
        <h3>Add Caption (Optional)</h3>
        <div v-if="pendingMedia" class="media-preview">
          <img
            v-if="pendingMedia.is_image"
            :src="pendingMedia.preview"
            :alt="pendingMedia.file.name"
          />
          <video
            v-else
            :src="pendingMedia.preview"
            controls
            preload="metadata"
          />
        </div>
        <textarea
          v-model="pendingCaption"
          :placeholder="pendingMedia ? `Add a caption for ${pendingMedia.file.name}...` : 'Add a caption...'"
          rows="3"
          class="caption-input"
        ></textarea>
        <div class="modal-actions">
          <button @click="closeCaptionModal" class="skip-btn">Skip</button>
          <button @click="uploadWithCaption" class="upload-btn" :disabled="hasActiveUploads">
            Upload
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { usePickupStore } from '@/stores/pickup'
import { folderApi, uploadApi } from '@/services/api'
import type { UploadMediaRequest } from '@/types'

interface Props {
  pickupId: string
  folderId: string
}

interface UploadItem {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled'
  progress: number
  error?: string
  useChunks: boolean
  sessionId?: string
  totalChunks?: number
  uploadedChunks?: number
  caption?: string
  abortController?: AbortController
  cancelled: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  uploadComplete: [media: any]
  uploadError: [error: string]
}>()

const toast = useToast()
const pickupStore = usePickupStore()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const uploadQueue = ref<UploadItem[]>([])

// Caption modal state
const showCaptionModal = ref(false)
const pendingMedia = ref<{
  file: File
  preview: string
  is_image: boolean
} | null>(null)
const pendingCaption = ref('')
const pendingResolve = ref<(() => void) | null>(null)

const hasActiveUploads = computed(() =>
  uploadQueue.value.some(item => item.status === 'uploading' || item.status === 'pending')
)

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
const DIRECT_UPLOAD_MAX_SIZE = 50 * 1024 * 1024 // 50MB direct upload limit

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  if (!e.currentTarget || e.currentTarget === e.target) {
    isDragOver.value = false
  }
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  handleFiles(files)
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  handleFiles(files)
  if (target) target.value = ''
}

const handleFiles = (files: File[]) => {
  const validFiles = files.filter(file => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error(`${file.name} is not a valid image or video file`)
      return false
    }
    return true
  })

  if (validFiles.length === 0) return

  validFiles.forEach(file => {
    const uploadItem: UploadItem = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      progress: 0,
      useChunks: file.size > DIRECT_UPLOAD_MAX_SIZE,
      cancelled: false,
    }
    uploadQueue.value.push(uploadItem)
  })

  processUploadQueue()
}

const processUploadQueue = async () => {
  for (const item of uploadQueue.value) {
    if (item.status === 'pending') {
      await askForCaption(item)
      await uploadFile(item)
    }
  }
}

const askForCaption = (item: UploadItem): Promise<void> => {
  return new Promise((resolve) => {
    const isImage = item.file.type.startsWith('image/')
    const preview = URL.createObjectURL(item.file)

    pendingMedia.value = {
      file: item.file,
      preview,
      is_image: isImage,
    }
    pendingCaption.value = item.caption || ''
    showCaptionModal.value = true
    pendingResolve.value = () => {
      showCaptionModal.value = false
      pendingMedia.value = null
      item.caption = pendingCaption.value
      URL.revokeObjectURL(preview)
      pendingResolve.value = null
      resolve()
    }
  })
}

const closeCaptionModal = () => {
  pendingCaption.value = ''
  if (pendingResolve.value) {
    pendingResolve.value()
  }
}

const uploadWithCaption = () => {
  if (pendingResolve.value) {
    pendingResolve.value()
  }
}

const uploadFile = async (item: UploadItem) => {
  if (item.cancelled) return

  item.status = 'uploading'
  item.progress = 0
  item.error = undefined

  try {
    if (item.useChunks) {
      await uploadChunkedFile(item)
    } else {
      await uploadDirectFile(item)
    }
  } catch (error: any) {
    if (item.cancelled) return
    item.status = 'error'
    item.error = error.response?.data?.error || error.message || 'Upload failed'
    toast.error(`Failed to upload ${item.file.name}: ${item.error}`)
    emit('uploadError', item.error || 'Upload failed')
  }
}

const uploadDirectFile = async (item: UploadItem) => {
  item.abortController = new AbortController()

  const uploadData: UploadMediaRequest = {
    file: item.file,
    caption: item.caption,
  }

  const response = await folderApi.uploadMedia(
    props.pickupId,
    props.folderId,
    uploadData,
        item.abortController?.signal
  )

  item.status = 'completed'
  item.progress = 100
  pickupStore.addMedia(response.data)
  emit('uploadComplete', response.data)
  toast.success(`${item.file.name} uploaded successfully`)
}

const uploadChunkedFile = async (item: UploadItem) => {
  const totalChunks = Math.ceil(item.file.size / CHUNK_SIZE)
  item.totalChunks = totalChunks
  item.uploadedChunks = 0
  item.abortController = new AbortController()

  const mediaType = item.file.type.startsWith('video/') ? 'video' : 'image'

  // Create upload session
  const sessionResponse = await uploadApi.createSession(
    props.pickupId,
    props.folderId,
    {
      file_name: item.file.name,
      file_size: item.file.size,
      media_type: mediaType,
      chunk_size: CHUNK_SIZE,
      caption: item.caption,
    }
  )

  item.sessionId = sessionResponse.data.id
  const sessionId = item.sessionId

  // Upload chunks sequentially with retry
  for (let i = 0; i < totalChunks; i++) {
    if (item.cancelled) return

    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, item.file.size)
    const chunk = item.file.slice(start, end)

    let retries = 0
    const maxRetries = 3
    let success = false

    while (retries < maxRetries && !success) {
      if (item.cancelled) return

      try {
        await uploadApi.uploadChunk(
          sessionId,
          i,
          chunk,
          (progress) => {
            // Update progress for this chunk
            const chunkProgress = progress / 100
            item.uploadedChunks = i + chunkProgress
            item.progress = Math.round((i + chunkProgress) / totalChunks * 100)
          },
          item.abortController?.signal
        )
        success = true
        item.uploadedChunks = i + 1
        item.progress = Math.round(((i + 1) / totalChunks) * 100)
      } catch (error: any) {
        retries++
        if (retries >= maxRetries) {
          throw new Error(`Chunk ${i} failed after ${maxRetries} retries`)
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retries))
      }
    }
  }

  // Finalize
  const response = await uploadApi.finalizeSession(sessionId)
  item.status = 'completed'
  item.progress = 100
  pickupStore.addMedia(response.data)
  emit('uploadComplete', response.data)
  toast.success(`${item.file.name} uploaded successfully`)
}

const retryUpload = (item: UploadItem) => {
  item.status = 'pending'
  item.progress = 0
  item.error = undefined
  item.uploadedChunks = 0
  item.cancelled = false
  uploadFile(item)
}

const cancelUpload = (item: UploadItem) => {
  item.cancelled = true
  item.status = 'cancelled'
  if (item.abortController) {
    item.abortController.abort()
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getStatusText = (item: UploadItem) => {
  switch (item.status) {
    case 'pending': return 'Waiting...'
    case 'uploading': return item.useChunks ? `Chunk ${Math.floor(item.uploadedChunks || 0)}/${item.totalChunks}` : 'Uploading...'
    case 'paused': return 'Paused'
    case 'completed': return '✓ Complete'
    case 'error': return '✗ Failed'
    case 'cancelled': return 'Cancelled'
    default: return item.status
  }
}
</script>

<style scoped>
.media-upload {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  transition: all 0.2s;
  position: relative;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: #667eea;
  background: #f8faff;
}

.upload-area.uploading {
  border-color: #10b981;
  background: #f0fdf4;
}

.file-input {
  display: none;
}

.upload-content {
  pointer-events: none;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.upload-content p {
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.upload-hint {
  font-size: 0.875rem;
  color: #9ca3af;
}

.browse-btn {
  background: #667eea;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  pointer-events: all;
  margin-top: 1rem;
}

.browse-btn:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-1px);
}

.browse-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.upload-progress {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.upload-progress h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.progress-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.progress-item {
  background: #f9fafb;
  border-radius: 6px;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
}

.progress-item.completed {
  border-color: #10b981;
  background: #f0fdf4;
}

.progress-item.error {
  border-color: #ef4444;
  background: #fef2f2;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 1rem;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.filename {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 0.75rem;
  color: #6b7280;
  flex-shrink: 0;
}

.chunk-badge {
  background: #667eea;
  color: white;
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
}

.status-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.status {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.retry-btn,
.cancel-btn {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  font-weight: 500;
}

.retry-btn {
  background: #f59e0b;
  color: white;
}

.cancel-btn {
  background: #ef4444;
  color: white;
}

.progress-bar {
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s ease;
}

.error-text {
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.5rem;
}

/* Caption Modal */
.caption-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow: auto;
}

.modal-content h3 {
  padding: 1.5rem 1.5rem 1rem;
  margin: 0;
  color: #1f2937;
}

.media-preview {
  padding: 0 1.5rem;
  margin-bottom: 1rem;
}

.media-preview img,
.media-preview video {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 6px;
  background: #f9fafb;
}

.caption-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  resize: vertical;
  font-family: inherit;
  margin: 0 1.5rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.skip-btn,
.upload-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.skip-btn {
  background: #e5e7eb;
  color: #374151;
}

.upload-btn {
  background: #667eea;
  color: white;
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .upload-area {
    padding: 1.5rem 1rem;
  }
  
  .progress-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .status-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
