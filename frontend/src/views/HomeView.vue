<template>
  <div class="home">
    <header class="hero">
      <div class="hero-content">
        <h1 class="title">Pickup</h1>
        <p class="subtitle">Share images and videos instantly, no account required</p>
        
        <div class="actions">
          <button @click="createNewPickup" class="primary-btn" :disabled="creating">
            {{ creating ? 'Creating...' : 'Create New Pickup' }}
          </button>
          <div class="or-divider">or</div>
          <div class="join-section">
            <input
              v-model="joinCode"
              type="text"
              placeholder="Enter pickup code"
              class="join-input"
              @keyup.enter="joinPickup"
            />
            <button @click="joinPickup" class="secondary-btn" :disabled="!joinCode.trim()">
              Join
            </button>
          </div>
        </div>
        
        <div v-if="newPickupUrl" class="pickup-created">
          <h3>🎉 Pickup Created!</h3>
          <p><strong>Creator Link:</strong> Keep this for yourself - it gives you full control over the pickup.</p>
          <div class="share-link">
            <input :value="newCreatorMemberUrl" readonly class="link-input creator-link" />
            <button @click="copyCreatorLink" class="copy-btn creator-copy-btn">
              {{ creatorCopied ? '✓ Copied!' : '📋 Copy' }}
            </button>
          </div>
          <p><strong>Share Link:</strong> Send this to others so they can join and upload.</p>
          <div class="share-link">
            <input :value="newPickupUrl" readonly class="link-input" />
            <button @click="copyLink" class="copy-btn">
              {{ copied ? '✓ Copied!' : '📋 Copy' }}
            </button>
          </div>
          <button @click="goToPickup" class="go-to-pickup-btn">
            🚀 Go to Pickup (Creator View)
          </button>
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
    </header>
    
    <section class="features">
      <div class="container">
        <h2>How Pickup Works</h2>
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">🚀</div>
            <h3>No Account Required</h3>
            <p>Start sharing immediately without creating an account or remembering passwords.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📁</div>
            <h3>Personal Folders</h3>
            <p>Each user gets their own folder. You can only edit your content, but can view everyone's.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔗</div>
            <h3>Easy Sharing</h3>
            <p>Share a simple link with anyone. They can join and start uploading right away.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📧</div>
            <h3>Email Reminders</h3>
            <p>Optionally get the share link emailed to you for easy access later.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { pickupApi } from '@/services/api'

const router = useRouter()
const toast = useToast()

const creating = ref(false)
const joinCode = ref('')
const newPickupUrl = ref('')
const newCreatorMemberUrl = ref('')
const newPickupId = ref('')
const copied = ref(false)
const creatorCopied = ref(false)
const error = ref('')

const createNewPickup = async () => {
  try {
    creating.value = true
    error.value = ''
    
    const response = await pickupApi.createPickup({ title: '' })
    const pickup = response.data
    
    newPickupId.value = pickup.id
    newPickupUrl.value = `${window.location.origin}${pickup.share_url}`
    newCreatorMemberUrl.value = pickup.creator_member_url
      ? `${window.location.origin}${pickup.creator_member_url}`
      : `${window.location.origin}${pickup.share_url}`
    toast.success('Pickup created successfully!')
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to create pickup'
    toast.error(error.value)
  } finally {
    creating.value = false
  }
}

const joinPickup = () => {
  const code = joinCode.value.trim()
  if (!code) return
  
  router.push(`/pickup/${code}`)
}

const goToPickup = () => {
  if (!newCreatorMemberUrl.value) return
  
  window.location.href = newCreatorMemberUrl.value
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(newPickupUrl.value)
    copied.value = true
    toast.success('Link copied to clipboard!')
    
    setTimeout(() => {
      copied.value = false
    }, 3000)
  } catch (err) {
    toast.error('Failed to copy link')
  }
}

const copyCreatorLink = async () => {
  try {
    await navigator.clipboard.writeText(newCreatorMemberUrl.value)
    creatorCopied.value = true
    toast.success('Creator link copied to clipboard!')
    
    setTimeout(() => {
      creatorCopied.value = false
    }, 3000)
  } catch (err) {
    toast.error('Failed to copy creator link')
  }
}

</script>

<style scoped>
.home {
  min-height: 100vh;
}

.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4rem 2rem;
  text-align: center;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-content {
  width: 100%;
}

.title {
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.subtitle {
  font-size: 1.25rem;
  margin-bottom: 3rem;
  opacity: 0.9;
  line-height: 1.6;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
}

.primary-btn {
  background: white;
  color: #667eea;
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.or-divider {
  opacity: 0.7;
  font-size: 0.875rem;
}

.join-section {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.join-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  transition: all 0.2s;
}

.join-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.join-input:focus {
  outline: none;
  border-color: white;
  background: rgba(255, 255, 255, 0.2);
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.75rem 1.5rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  border-color: white;
}

.pickup-created {
  background: rgba(16, 185, 129, 0.1);
  border: 2px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
  text-align: left;
}

.pickup-created h3 {
  margin: 0 0 0.5rem;
  color: #10b981;
}

.pickup-created p {
  margin: 0 0 1rem;
  opacity: 0.9;
}

.pickup-created p strong {
  color: #10b981;
}

.share-link {
  display: flex;
  gap: 0.5rem;
}

.link-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.875rem;
}

.link-input.creator-link {
  border-color: rgba(16, 185, 129, 0.5);
  background: rgba(16, 185, 129, 0.1);
}

.copy-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.copy-btn.creator-copy-btn {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.5);
}

.copy-btn.creator-copy-btn:hover {
  background: rgba(16, 185, 129, 0.3);
}

.go-to-pickup-btn {
  display: block;
  width: 100%;
  margin-top: 1rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.go-to-pickup-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(16, 185, 129, 0.3);
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  color: #fca5a5;
}

.features {
  padding: 4rem 2rem;
  background: #f9fafb;
}

.container {
  width: 100%;
  padding: 0 2rem;
}

.features h2 {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 3rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.feature-card p {
  color: #6b7280;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .hero {
    padding: 3rem 1.5rem;
  }
  
  .title {
    font-size: 2.5rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
  
  .join-section {
    max-width: 100%;
  }
  
  .share-link {
    flex-direction: column;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
  }
  
  .container {
    padding: 0 1.5rem;
  }
}
</style>
