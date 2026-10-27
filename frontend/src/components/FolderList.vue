<template>
  <div class="folder-list">
    <div class="list-header">
      <h3>Folders ({{ folders.length }})</h3>
      <button @click="refreshFolders" class="refresh-btn" :disabled="loading">
        🔄
      </button>
    </div>
    
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading folders...</p>
    </div>
    
    <div v-else-if="folders.length === 0" class="empty-state">
      <div class="empty-icon">📂</div>
      <h4>No folders yet</h4>
      <p>Be the first to create a folder in this pickup!</p>
    </div>
    
    <div v-else class="folders-grid">
      <div
        v-for="folder in folders"
        :key="folder.id"
        class="folder-card"
        :class="{ 'current-folder': folder.id === currentFolderId }"
        @click="selectFolder(folder)"
      >
        <div class="folder-header">
          <div class="folder-icon">📁</div>
          <div class="folder-info">
            <h4>{{ folder.name }}</h4>
            <p class="folder-owner">by {{ folder.user_name }}</p>
          </div>
        </div>
        
        <div class="folder-stats">
          <span class="media-count">{{ folder.media_count }} media</span>
          <span class="created-date">{{ formatDate(folder.created_at) }}</span>
        </div>
        
        <div v-if="folder.can_edit" class="owner-badge">
          👤 Your Folder
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { usePickupStore } from '@/stores/pickup'
import type { Folder } from '@/types'

interface Props {
  folders: Folder[]
  loading?: boolean
  pickupId: string
  currentFolderId?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  folderSelected: [folder: Folder]
}>()

const router = useRouter()
const toast = useToast()
const pickupStore = usePickupStore()

const refreshing = ref(false)

const selectFolder = (folder: Folder) => {
  emit('folderSelected', folder)
  router.push(`/pickup/${props.pickupId}/folder/${folder.id}`)
}

const refreshFolders = async () => {
  try {
    refreshing.value = true
    await pickupStore.loadFolders(props.pickupId)
    toast.success('Folders refreshed')
  } catch (err: any) {
    toast.error('Failed to refresh folders')
  } finally {
    refreshing.value = false
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return 'Today'
  if (diffDays === 2) return 'Yesterday'
  if (diffDays <= 7) return `${diffDays - 1} days ago`
  
  return date.toLocaleDateString()
}
</script>

<style scoped>
.folder-list {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.list-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.refresh-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.25rem;
  transition: background-color 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.refresh-btn:disabled {
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

.folders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.folder-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.folder-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.folder-card.current-folder {
  border-color: #667eea;
  background: #f8faff;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.folder-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.folder-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.folder-info {
  flex: 1;
  min-width: 0;
}

.folder-info h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-owner {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.folder-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: #6b7280;
}

.media-count {
  font-weight: 500;
}

.created-date {
  font-size: 0.75rem;
}

.owner-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: #667eea;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}
</style>
