import { createRouter, createWebHistory } from 'vue-router'

import { homeRoutes } from './routes/home'
import { pickupRoutes } from './routes/pickups'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...homeRoutes, ...pickupRoutes, { path: '/:pathMatch(.*)*', redirect: '/' }],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  // Earlier versions kept member ids (then credentials) in localStorage; remove them.
  if (typeof to.params.pickupId === 'string') {
    localStorage.removeItem(`pickup_member_${to.params.pickupId}`)
  }
})

export default router
