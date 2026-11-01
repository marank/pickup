import type { RouteRecordRaw } from 'vue-router'

// Loaded on demand: the start page doesn't need them.
const ExplorerView = () => import('@/features/explorer/views/ExplorerView.vue')
const JoinView = () => import('@/features/pickups/views/JoinView.vue')
const CreateView = () => import('@/features/pickups/views/CreateView.vue')
const ConfirmEmailView = () => import('@/features/pickups/views/ConfirmEmailView.vue')
const MemberLinkView = () => import('@/features/pickups/views/MemberLinkView.vue')

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
    // Pages shown in the explorer's content pane: the timeline, the creator's settings and people.
    path: '/pickup/:pickupId/:page(timeline|settings|people)',
    name: 'explorer-page',
    component: ExplorerView,
    props: true,
    meta: { wide: true },
  },
  {
    // Personal link: says whose link it is; its button trades the key for a session.
    path: '/pickup/:pickupId/member/:accessKey',
    name: 'pickup-member',
    component: MemberLinkView,
    props: true,
    meta: { wide: true, bare: true },
  },
  { path: '/pickup/:pickupId/join', name: 'pickup-join', component: JoinView, props: true },
  {
    // From the mail that confirms a new address; the token follows after the #.
    path: '/pickup/:pickupId/confirm-email',
    name: 'pickup-confirm-email',
    component: ConfirmEmailView,
    props: true,
  },
  // Links from before the explorer.
  { path: '/pickup/:pickupId/folder/:folderId', redirect: { name: 'explorer-folder' } },
]
