<template>
  <div class="folder-view">
    <header class="folder-header">
      <div class="header-content">
        <div class="breadcrumb">
          <router-link :to="`/pickup/${pickupId}`" class="breadcrumb-link">
            ← Back to Pickup
          </router-link>
        </div>
        
        <div class="folder-info">
          <h1>{{ folder?.name }}</h1>
          <p class="folder-meta">
            Created by {{ folder?.user_name }} • {{ folderMedia.length }} media files
          </p>
          <div v-if="folder?.can_edit" class="owner-badge">
            👤 This is your folder
          </div>
        </div>
      </div>
    </header>
    
    <main class="folder-main">
      <div class="content-container">
        <!-- Upload Section -->
        <section v-if="folder?.can_edit" class="upload-section">
          <MediaUpload
            :pickup-id="pickupId"
            :folder-id="folderId"
            @upload-complete="handleUploadComplete"
            @upload-error="handleUploadError"
          />
        </section>
        
        <!-- Media Gallery -->
        <section class="gallery-section">
          <MediaGallery
            :media="currentFolderMedia"
            :title="folder?.can_edit ? 'Your Media' : `${folder?.user_name}'s Media`"
            :empty-message="folder?.can_edit ? 'No media yet. Upload some files to get started!' : 'No media in this folder yet.'"
            :can-edit="folder?.can_edit"
            :loading="loading"
            :pickup-id="pickupId"
            :folder-id="folderId"
            @media-updated="handleMediaUpdated"
            @media-deleted="handleMediaDeleted"
          />
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { usePickupStore } from '@/stores/pickup'
import { folderApi } from '@/services/api'
import MediaUpload from '@/components/MediaUpload.vue'
import MediaGallery from '@/components/MediaGallery.vue'
import type { Media } from '@/types'

interface Props {
  pickupId: string
  folderId: string
}

const props = defineProps<Props>()
const toast = useToast()
const pickupStore = usePickupStore()

const currentFolderMedia = computed(() => pickupStore.currentFolderMedia)
const loading = ref(false)

// Get folder media from the store
const folderMedia = computed(() => pickupStore.folderMedia)

// Load folder details with member authentication
const folder = ref(pickupStore.currentFolder)

const loadFolder = async () => {
  try {
    loading.value = true
    const response = await folderApi.getFolder(
      props.pickupId,
      props.folderId
    )
    folder.value = response.data
    pickupStore.currentFolder = response.data
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load folder')
  } finally {
    loading.value = false
  }
}

const handleUploadComplete = (media: Media) => {
  toast.success(`${media.original_filename} uploaded successfully!`)
}

const handleUploadError = (error: string) => {
  toast.error(`Upload failed: ${error}`)
}

const handleMediaUpdated = (media: Media) => {
  // Store is already updated by the upload component
}

const handleMediaDeleted = (mediaId: string) => {
  toast.success('Media deleted successfully')
}

// Watch for route changes to reload folder data
watch(
  () => props.folderId,
  async (newFolderId) => {
    if (newFolderId && props.pickupId) {
      try {
        await loadFolder()
        await pickupStore.loadFolderMedia(props.pickupId, newFolderId)
      } catch (error) {
        toast.error('Failed to load folder media')
      }
    }
  },
  { immediate: true }
)

onMounted(async () => {
  try {
    if (!folder.value || folder.value.id !== props.folderId) {
      await loadFolder()
    }
    // Load folder media if not already loaded
    if (!currentFolderMedia.value.length) {
      await pickupStore.loadFolderMedia(props.pickupId, props.folderId)
    }
  } catch (error) {
    toast.error('Failed to load folder data')
  }
})
</script>

<style scoped>
.folder-view {
  min-height: 100vh;
  background: #f3f4f6;
}

.folder-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 2rem;
}

.breadcrumb {
  margin-bottom: 1rem;
}

.breadcrumb-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #5a67d8;
}

.folder-info h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem;
}

.folder-meta {
  color: #6b7280;
  font-size: 1rem;
  margin: 0 0 1rem;
}

.owner-badge {
  display: inline-block;
  background: #667eea;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
}

.folder-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.content-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.upload-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.gallery-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .header-content {
    padding: 1rem;
  }
  
  .folder-info h1 {
    font-size: 1.5rem;
  }
  
  .folder-main {
    padding: 1rem;
  }
  
  .content-container {
    gap: 1rem;
  }
}
</style>
