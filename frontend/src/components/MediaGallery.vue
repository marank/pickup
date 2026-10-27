<template>
  <div class="media-gallery">
    <div class="gallery-header">
      <h3>{{ title }}</h3>
      <div class="gallery-actions" v-if="canEdit && media.length > 0">
        <button @click="clearAllMedia" class="clear-btn" :disabled="loading">Clear All</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading media...</p>
    </div>

    <div v-else-if="media.length === 0" class="empty-state">
      <div class="empty-icon">📁</div>
      <h4>No media yet</h4>
      <p>{{ emptyMessage }}</p>
    </div>

    <div v-else class="media-grid">
      <div
        v-for="item in media"
        :key="item.id"
        class="media-item"
        :class="{ 'can-edit': item.can_edit }"
      >
        <div class="media-container" @click="openMediaPreview(item)">
          <img
            v-if="item.is_image"
            :src="item.file"
            :alt="item.caption || item.original_filename"
            class="media-image"
            loading="lazy"
          />
          <video v-else :src="item.file" class="media-video" controls preload="metadata" />

          <div class="media-overlay">
            <div class="media-info">
              <p class="media-filename">{{ item.original_filename }}</p>
              <p class="media-size">{{ item.file_size_display }}</p>
            </div>
          </div>
        </div>

        <div v-if="item.caption" class="media-caption">
          {{ item.caption }}
        </div>

        <div v-if="item.can_edit" class="media-actions">
          <button @click="editCaption(item)" class="action-btn edit-btn">✏️</button>
          <button @click="deleteMedia(item)" class="action-btn delete-btn">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Media Preview Modal -->
    <div v-if="previewMedia" class="media-modal" @click="closeMediaPreview">
      <div class="modal-content" @click.stop>
        <button class="close-btn" @click="closeMediaPreview">✕</button>

        <div class="modal-media">
          <img
            v-if="previewMedia.is_image"
            :src="previewMedia.file"
            :alt="previewMedia.caption || previewMedia.original_filename"
          />
          <video v-else :src="previewMedia.file" controls autoplay />
        </div>

        <div class="modal-info">
          <h3>{{ previewMedia.original_filename }}</h3>
          <p v-if="previewMedia.caption" class="caption">{{ previewMedia.caption }}</p>
          <p class="meta">
            {{ previewMedia.file_size_display }} •
            {{ formatDate(previewMedia.uploaded_at) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Edit Caption Modal -->
    <div v-if="editingMedia" class="caption-modal" @click="closeCaptionEdit">
      <div class="modal-content" @click.stop>
        <h3>Edit Caption</h3>
        <textarea
          v-model="editingCaption"
          placeholder="Add a caption..."
          rows="3"
          class="caption-input"
        ></textarea>
        <div class="modal-actions">
          <button @click="closeCaptionEdit" class="cancel-btn">Cancel</button>
          <button @click="saveCaption" class="save-btn" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
import { usePickupStore } from '@/stores/pickup'
import { mediaApi, folderApi, apiErrorMessage } from '@/services/api'
import type { Media } from '@/types'

interface Props {
  media: Media[]
  title: string
  emptyMessage: string
  canEdit?: boolean
  loading?: boolean
  pickupId: string
  folderId?: string
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: false,
  loading: false,
})

const emit = defineEmits<{
  mediaUpdated: [media: Media]
  mediaDeleted: [mediaId: string]
}>()

const toast = useToast()
const pickupStore = usePickupStore()

const previewMedia = ref<Media | null>(null)
const editingMedia = ref<Media | null>(null)
const editingCaption = ref('')
const saving = ref(false)

const openMediaPreview = (media: Media) => {
  previewMedia.value = media
}

const closeMediaPreview = () => {
  previewMedia.value = null
}

const editCaption = (media: Media) => {
  editingMedia.value = media
  editingCaption.value = media.caption || ''
}

const closeCaptionEdit = () => {
  editingMedia.value = null
  editingCaption.value = ''
}

const saveCaption = async () => {
  if (!editingMedia.value || !props.folderId) return

  try {
    saving.value = true
    const response = await mediaApi.updateCaption(
      props.pickupId,
      props.folderId,
      editingMedia.value.id,
      editingCaption.value,
    )

    pickupStore.updateMediaCaption(editingMedia.value.id, editingCaption.value)
    emit('mediaUpdated', response.data)

    toast.success('Caption updated')
    closeCaptionEdit()
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Failed to update caption'))
  } finally {
    saving.value = false
  }
}

const deleteMedia = async (media: Media) => {
  if (!props.folderId) return

  if (!confirm(`Are you sure you want to delete "${media.original_filename}"?`)) {
    return
  }

  try {
    await mediaApi.deleteMedia(props.pickupId, props.folderId, media.id)
    pickupStore.removeMedia(media.id)
    emit('mediaDeleted', media.id)

    toast.success('Media deleted')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Failed to delete media'))
  }
}

const clearAllMedia = async () => {
  if (!props.folderId) return

  if (!confirm('Are you sure you want to delete all media in this folder?')) {
    return
  }

  try {
    await folderApi.clearFolder(props.pickupId, props.folderId)

    // Clear local state
    props.media.forEach((media) => {
      pickupStore.removeMedia(media.id)
    })

    toast.success('All media cleared')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Failed to clear folder'))
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}
</script>

<style scoped>
.media-gallery {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.gallery-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.clear-btn {
  background: #ef4444;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.clear-btn:hover:not(:disabled) {
  background: #dc2626;
}

.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h4 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.media-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.media-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.media-container {
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
  overflow: hidden;
}

.media-image,
.media-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  color: white;
  padding: 1rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.media-container:hover .media-overlay {
  opacity: 1;
}

.media-info p {
  margin: 0;
  font-size: 0.875rem;
}

.media-filename {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-size {
  opacity: 0.8;
}

.media-caption {
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #374151;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.media-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.action-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.edit-btn:hover {
  background: #e5e7eb;
}

.delete-btn:hover {
  background: #fef2f2;
}

/* Modal Styles */
.media-modal,
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
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
  font-size: 1.25rem;
  z-index: 10;
}

.modal-media img,
.modal-media video {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.modal-info {
  padding: 1.5rem;
}

.modal-info h3 {
  margin: 0 0 0.5rem;
  color: #1f2937;
}

.caption {
  color: #374151;
  margin: 0.5rem 0;
  font-style: italic;
}

.meta {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

.caption-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  resize: vertical;
  font-family: inherit;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.cancel-btn,
.save-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.cancel-btn {
  background: #e5e7eb;
  color: #374151;
}

.save-btn {
  background: #667eea;
  color: white;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
