import type { RouteRecordRaw } from 'vue-router'

import { enterPickup } from '@/features/pickups/composables/usePickup'

// Loaded on demand: the start page doesn't need them.
const PickupView = () => import('@/features/pickups/views/PickupView.vue')
const JoinView = () => import('@/features/pickups/views/JoinView.vue')
const FolderView = () => import('@/features/media/views/FolderView.vue')

export const pickupRoutes: RouteRecordRaw[] = [
  { path: '/pickup/:pickupId', name: 'pickup', component: PickupView, props: true },
  {
    // Personal link: the access key is exchanged for a session, then the address bar
    // switches to the plain pickup URL so the key doesn't linger in history.
    path: '/pickup/:pickupId/member/:accessKey',
    name: 'pickup-member',
    component: PickupView,
    beforeEnter: async (to) => {
      const pickupId = to.params.pickupId as string
      try {
        await enterPickup(pickupId, to.params.accessKey as string)
        return { name: 'pickup', params: { pickupId }, replace: true }
      } catch {
        return { name: 'pickup-join', params: { pickupId }, query: { invalidLink: '1' } }
      }
    },
  },
  { path: '/pickup/:pickupId/join', name: 'pickup-join', component: JoinView, props: true },
  {
    path: '/pickup/:pickupId/folder/:folderId',
    name: 'folder',
    component: FolderView,
    props: true,
  },
]
