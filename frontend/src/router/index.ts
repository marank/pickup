import { createRouter, createWebHistory } from 'vue-router'

import { pageKey } from './pageKey'
import { homeRoutes } from './routes/home'
import { pickupRoutes } from './routes/pickups'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...homeRoutes, ...pickupRoutes, { path: '/:pathMatch(.*)*', redirect: '/' }],
  // A new page scrolls to the top once the old one has faded out (App.vue); within a page
  // (folders of a pickup) right away.
  scrollBehavior: (to, from) => (pageKey(to) === pageKey(from) ? { top: 0 } : false),
})

router.beforeEach((to) => {
  // Earlier versions kept member ids (then credentials) in localStorage; remove them.
  if (typeof to.params.pickupId === 'string') {
    localStorage.removeItem(`pickup_member_${to.params.pickupId}`)
  }
})

export default router
