import type { RouteRecordRaw } from 'vue-router'

import HomeView from '@/features/home/views/HomeView.vue'

// Loaded on demand: only people who got the server's link see it.
const ConnectView = () => import('@/features/home/views/ConnectView.vue')

export const homeRoutes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView, meta: { wide: true } },
  // Adds this server to the apps' server list (manage.py server_link).
  { path: '/connect', name: 'connect', component: ConnectView },
]
