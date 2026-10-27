import { createRouter, createWebHistory } from 'vue-router'
import { usePickupStore } from '@/stores/pickup'
import HomeView from '../views/HomeView.vue'
import PickupView from '../views/PickupView.vue'
import PickupJoinView from '../views/PickupJoinView.vue'
import FolderView from '../views/FolderView.vue'

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
      // Personal link: the access key is exchanged for a session in the guard below,
      // then the address bar switches to the plain pickup URL.
      path: '/pickup/:pickupId/member/:accessKey',
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
router.beforeEach(async (to) => {
  const pickupStore = usePickupStore()

  // Reset state when navigating to home
  if (to.name === 'home') {
    pickupStore.resetState()
    return
  }

  // Personal link: log this browser in, then drop the secret key from the URL
  if (to.name === 'pickup-member') {
    const pickupId = to.params.pickupId as string
    try {
      await pickupStore.enterWithKey(pickupId, to.params.accessKey as string)
      return { name: 'pickup', params: { id: pickupId }, replace: true }
    } catch {
      return { name: 'pickup-join', params: { pickupId } }
    }
  }

  // Check if accessing pickup or folder routes
  if (to.name === 'pickup' || to.name === 'folder') {
    const pickupId = (to.params.id || to.params.pickupId) as string
    // Earlier versions kept member ids here; they are no longer credentials.
    localStorage.removeItem(`pickup_member_${pickupId}`)

    // Load pickup data if not already loaded
    if (!pickupStore.currentPickup || pickupStore.currentPickup.id !== pickupId) {
      try {
        await pickupStore.loadPickup(pickupId)
      } catch {
        // If pickup not found or error, redirect to join
        return { name: 'pickup-join', params: { pickupId } }
      }
    }
  }
})

export default router
