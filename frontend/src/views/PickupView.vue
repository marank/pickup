<template>
  <div class="pickup-view">
    <header class="pickup-header">
      <div class="header-content">
        <div class="pickup-info">
          <h1>{{ pickup?.title || 'Untitled Pickup' }}</h1>
          <p class="pickup-stats">
            {{ folders.length }} folders • {{ allMedia.length }} media files
            <span v-if="isCreator" class="creator-badge">👑 Creator</span>
          </p>
        </div>
        
        <div class="header-actions">
          <button @click="copyShareLink" class="share-btn">
            {{ copied ? '✓ Copied!' : '🔗 Share' }}
          </button>
          <button v-if="!isAuthenticated" @click="joinPickup" class="join-btn">
            Join Pickup
          </button>
          <button v-else @click="goToFolder" class="folder-btn">
            📁 Your Folder
          </button>
        </div>
      </div>
    </header>
    
    <main class="pickup-main">
      <div class="content-grid">
        <!-- Folders Section -->
        <section class="folders-section">
          <FolderList
            :folders="folders"
            :loading="loading"
            :pickup-id="pickupId"
            :current-folder-id="currentFolderId"
            @folder-selected="handleFolderSelected"
          />
        </section>
        
        <!-- All Media Section -->
        <section class="media-section">
          <MediaGallery
            :media="allMedia"
            title="All Media"
            empty-message="No media has been uploaded yet. Join the pickup to start uploading!"
            :can-edit="false"
            :loading="loading"
            :pickup-id="pickupId"
          />
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { usePickupStore } from '@/stores/pickup'
import FolderList from '@/components/FolderList.vue'
import MediaGallery from '@/components/MediaGallery.vue'
import type { Folder } from '@/types'

interface Props {
  id?: string
  pickupId?: string
}

const props = defineProps<Props>()
const router = useRouter()
const toast = useToast()
const pickupStore = usePickupStore()

const copied = ref(false)

const pickup = computed(() => pickupStore.currentPickup)
const folders = computed(() => pickupStore.folders)
const allMedia = computed(() => pickupStore.allMedia)
const loading = computed(() => pickupStore.loading)
const isAuthenticated = computed(() => pickupStore.isAuthenticated)
const isCreator = computed(() => pickupStore.isCreator)
const currentFolderId = computed(() => pickupStore.currentFolder?.id)

// Get the pickup ID from props (/pickup/:id; personal links redirect there)
const pickupId = computed(() => props.id || props.pickupId || '')

const handleFolderSelected = (folder: Folder) => {
  // Navigation is handled by the FolderList component
}

const joinPickup = () => {
  router.push(`/pickup/${pickupId.value}/join`)
}

const goToFolder = () => {
  if (pickupStore.currentFolder) {
    router.push(`/pickup/${pickupId.value}/folder/${pickupStore.currentFolder.id}`)
  }
}

const copyShareLink = async () => {
  try {
    const shareUrl = `${window.location.origin}/pickup/${pickupId.value}`
    await navigator.clipboard.writeText(shareUrl)
    copied.value = true
    toast.success('Share link copied to clipboard!')
    
    setTimeout(() => {
      copied.value = false
    }, 3000)
  } catch (err) {
    toast.error('Failed to copy share link')
  }
}

onMounted(async () => {
  if (!pickupId.value) return
  try {
    // Load pickup data is handled by router guard
    await Promise.all([
      pickupStore.loadFolders(pickupId.value),
      pickupStore.loadAllMedia(pickupId.value)
    ])

    // If this browser is logged in as a member, set current folder to the member's folder
    if (!pickupStore.currentFolder) {
      const memberFolder = pickupStore.folders.find(f => f.can_edit)
      if (memberFolder) {
        pickupStore.currentFolder = memberFolder
      }
    }
  } catch (error) {
    toast.error('Failed to load pickup data')
  }
})
</script>

<style scoped>
.pickup-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  width: 100%;
}

.pickup-view::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.05) 0%, transparent 50%);
  pointer-events: none;
}

.pickup-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.header-content {
  width: 100%;
  padding: 2rem 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 2rem;
}

.pickup-info {
  flex: 1;
}

.pickup-info h1 {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.75rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pickup-stats {
  color: #6b7280;
  font-size: 1.125rem;
  margin: 0;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.creator-badge {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-shrink: 0;
}

.share-btn,
.join-btn,
.folder-btn {
  padding: 0.875rem 1.75rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.share-btn {
  background: linear-gradient(135deg, #667eea 0%, #5a67d8 100%);
  color: white;
}

.share-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(102, 126, 234, 0.3);
}

.share-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.share-btn:hover::before {
  left: 100%;
}

.join-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.join-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(16, 185, 129, 0.3);
}

.folder-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.folder-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(245, 158, 11, 0.3);
}

.pickup-main {
  width: 100%;
  padding: 3rem;
  position: relative;
  z-index: 1;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  min-height: 600px;
  width: 100%;
}

.content-grid > * {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
}

.content-grid > *:hover {
  transform: translateY(-4px);
}

/* Desktop Layout - Full Width */
@media (min-width: 1024px) {
  .pickup-info h1 {
    font-size: 3rem;
  }
  
  .header-content {
    padding: 2.5rem 4rem;
  }
  
  .pickup-main {
    padding: 4rem;
  }
  
  .content-grid {
    gap: 3rem;
  }
}

/* Tablet Layout */
@media (max-width: 1023px) and (min-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .header-content {
    padding: 2rem 3rem;
  }
  
  .pickup-main {
    padding: 3rem;
  }
}

/* Mobile Layout - Optimized for phones */
@media (max-width: 767px) {
  .header-content {
    padding: 1.5rem 1.25rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }
  
  .pickup-info h1 {
    font-size: 1.75rem;
  }
  
  .pickup-stats {
    font-size: 1rem;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  
  .share-btn,
  .join-btn,
  .folder-btn {
    padding: 0.75rem 1.25rem;
    font-size: 0.875rem;
    flex: 1;
    min-width: 120px;
  }
  
  .pickup-main {
    padding: 1.5rem 1.25rem;
  }
  
  .content-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .content-grid > * {
    border-radius: 12px;
  }
}
</style>
