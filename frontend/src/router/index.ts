import { createRouter, createWebHistory } from 'vue-router'
import { usePickupStore } from '@/stores/pickup'
import HomeView from '../views/HomeView.vue'
import PickupView from '../views/PickupView.vue'
import PickupJoinView from '../views/PickupJoinView.vue'
import FolderView from '../views/FolderView.vue'

const MEMBER_STORAGE_KEY = (pickupId: string) => `pickup_member_${pickupId}`

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/pickup/:id',
      name: 'pickup',
      component: PickupView,
      props: true,
    },
    {
      path: '/pickup/:pickupId/member/:memberId',
      name: 'pickup-member',
      component: PickupView,
      props: true,
    },
    {
      path: '/pickup/:pickupId/join',
      name: 'pickup-join',
      component: PickupJoinView,
      props: true,
    },
    {
      path: '/pickup/:pickupId/folder/:folderId',
      name: 'folder',
      component: FolderView,
      props: true,
    },
  ],
})

// Navigation guard to check authentication
router.beforeEach(async (to, from) => {
  const pickupStore = usePickupStore()

  // Reset state when navigating to home
  if (to.name === 'home') {
    pickupStore.resetState()
    return
  }

  // Handle member route - set member ID, persist it, and load pickup
  if (to.name === 'pickup-member') {
    const pickupId = to.params.pickupId as string
    const memberId = to.params.memberId as string
    pickupStore.setMemberId(memberId)
    localStorage.setItem(MEMBER_STORAGE_KEY(pickupId), memberId)

    if (!pickupStore.currentPickup || pickupStore.currentPickup.id !== pickupId) {
      try {
        await pickupStore.loadPickup(pickupId, memberId)
      } catch (error) {
        return { name: 'pickup-join', params: { pickupId } }
      }
    }
    return
  }

  // Check if accessing pickup or folder routes
  if (to.name === 'pickup' || to.name === 'folder') {
    const pickupId = (to.params.id || to.params.pickupId) as string
    const storedMemberId = localStorage.getItem(MEMBER_STORAGE_KEY(pickupId))

    // Restore member ID from localStorage if available
    if (storedMemberId && !pickupStore.currentMemberId) {
      pickupStore.setMemberId(storedMemberId)
    }

    // Load pickup data if not already loaded
    if (!pickupStore.currentPickup || pickupStore.currentPickup.id !== pickupId) {
      try {
        await pickupStore.loadPickup(pickupId, storedMemberId || undefined)
      } catch (error) {
        // If pickup not found or error, redirect to join
        return { name: 'pickup-join', params: { pickupId } }
      }
    }
  }
})

export default router
