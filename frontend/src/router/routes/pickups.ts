import type { RouteRecordRaw } from 'vue-router'

import { enterPickup } from '@/features/pickups/composables/usePickup'

// Loaded on demand: the start page doesn't need them.
const ExplorerView = () => import('@/features/explorer/views/ExplorerView.vue')
const JoinView = () => import('@/features/pickups/views/JoinView.vue')
const CreateView = () => import('@/features/pickups/views/CreateView.vue')

export const pickupRoutes: RouteRecordRaw[] = [
  { path: '/create', name: 'create', component: CreateView },
  {
    path: '/pickup/:pickupId',
    name: 'explorer',
    component: ExplorerView,
    props: true,
    meta: { wide: true },
  },
  {
    path: '/pickup/:pickupId/f/:folderId',
    name: 'explorer-folder',
    component: ExplorerView,
    props: true,
    meta: { wide: true },
  },
  {
    // The creator's pages, shown in the explorer's content pane.
    path: '/pickup/:pickupId/:page(settings|people)',
    name: 'explorer-page',
    component: ExplorerView,
    props: true,
    meta: { wide: true },
  },
  {
    // Personal link: the access key is exchanged for a session, then the address bar
    // switches to the plain pickup URL so the key doesn't linger in history.
    path: '/pickup/:pickupId/member/:accessKey',
    name: 'pickup-member',
    component: ExplorerView,
    beforeEnter: async (to) => {
      const pickupId = to.params.pickupId as string
      try {
        await enterPickup(pickupId, to.params.accessKey as string)
        return { name: 'explorer', params: { pickupId }, replace: true }
      } catch {
        return { name: 'pickup-join', params: { pickupId }, query: { invalidLink: '1' } }
      }
    },
  },
  { path: '/pickup/:pickupId/join', name: 'pickup-join', component: JoinView, props: true },
  // Links from before the explorer.
  { path: '/pickup/:pickupId/folder/:folderId', redirect: { name: 'explorer-folder' } },
]
