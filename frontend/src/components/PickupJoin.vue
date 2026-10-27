<template>
  <div class="pickup-join">
    <div class="join-card">
      <h1>Join Pickup</h1>
      <p class="pickup-title">{{ pickup?.title || 'Untitled Pickup' }}</p>
      
      <form @submit.prevent="handleSubmit" class="join-form">
        <div class="form-group">
          <label for="userName">Your Name *</label>
          <input
            id="userName"
            v-model="formData.user_name"
            type="text"
            required
            placeholder="Enter your name"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label for="folderName">Folder Name *</label>
          <input
            id="folderName"
            v-model="formData.name"
            type="text"
            required
            placeholder="Name your folder"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label for="userEmail">Email (Optional)</label>
          <input
            id="userEmail"
            v-model="formData.user_email"
            type="email"
            placeholder="your@email.com"
            class="form-input"
          />
          <small class="form-help">
            We'll email you the share link for easy access
          </small>
        </div>
        
        <button 
          type="submit" 
          :disabled="loading"
          class="submit-btn"
        >
          <span v-if="loading">Joining...</span>
          <span v-else>Join Pickup</span>
        </button>
      </form>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePickupStore } from '@/stores/pickup'
import { useToast } from 'vue-toastification'
import type { CreateFolderRequest } from '@/types'

interface Props {
  pickupId: string
}

const props = defineProps<Props>()
const router = useRouter()
const pickupStore = usePickupStore()
const toast = useToast()

const formData = ref<CreateFolderRequest>({
  name: '',
  user_name: '',
  user_email: '',
})

// Auto-fill folder name based on user name
watch(() => formData.value.user_name, (newName) => {
  if (newName) {
    formData.value.name = newName
  }
})

const loading = ref(false)
const error = ref<string | null>(null)

const pickup = pickupStore.currentPickup

const handleSubmit = async () => {
  try {
    loading.value = true
    error.value = null
    
    const response = await pickupStore.joinPickup(props.pickupId, formData.value)
    
    toast.success('Successfully joined pickup!')
    // Redirect to the member URL which authenticates the user
    if (response.member_url) {
      router.push(response.member_url)
    } else {
      router.push(`/pickup/${props.pickupId}`)
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to join pickup'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    await pickupStore.loadPickup(props.pickupId)
  } catch (err) {
    toast.error('Failed to load pickup')
    router.push('/')
  }
})
</script>

<style scoped>
.pickup-join {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.join-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
  text-align: center;
}

.pickup-title {
  color: #6b7280;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.join-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.form-input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-help {
  color: #6b7280;
  font-size: 0.75rem;
}

.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid #fecaca;
  font-size: 0.875rem;
  margin-top: 1rem;
}
</style>
