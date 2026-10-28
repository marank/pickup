<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import 'vue-sonner/style.css'

import SplashScreen from '@/components/SplashScreen.vue'
import { Toaster } from '@/components/ui/sonner'
import AppLayout from '@/layouts/AppLayout.vue'
import { pageKey } from '@/router/pageKey'

/** How long the logo intro needs (LogoIntro.vue) plus a short moment to look at it. */
const SPLASH_MS = 1650
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// Opening a pickup by its link: the logo assembles in the middle, then the pickup appears.
const splash = ref(window.location.pathname.startsWith('/pickup/') && !reducedMotion())
onMounted(() => {
  if (splash.value) window.setTimeout(() => (splash.value = false), SPLASH_MS)
})

const scrollTop = () => window.scrollTo({ top: 0 })
</script>

<template>
  <AppLayout>
    <RouterView v-slot="{ Component, route }">
      <Transition name="page" mode="out-in" @after-leave="scrollTop">
        <div
          :key="pageKey(route)"
          :class="route.meta.wide ? undefined : 'mx-auto max-w-6xl px-4 py-8'"
        >
          <component :is="Component" />
        </div>
      </Transition>
    </RouterView>
  </AppLayout>
  <Transition name="splash">
    <SplashScreen v-if="splash" />
  </Transition>
  <Toaster rich-colors position="top-right" />
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.22s ease,
    translate 0.22s ease;
}
.page-enter-from {
  opacity: 0;
  translate: 0 12px;
}
.page-leave-to {
  opacity: 0;
  translate: 0 -8px;
}

.splash-leave-active {
  transition:
    opacity 0.45s ease,
    scale 0.45s ease;
}
.splash-leave-to {
  opacity: 0;
  scale: 1.04;
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: opacity 0.12s;
  }
  .page-enter-from,
  .page-leave-to {
    translate: none;
  }
}
</style>
