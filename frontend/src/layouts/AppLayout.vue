<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import PickupLogo from '@/components/PickupLogo.vue'

const route = useRoute()
const wide = computed(() => route.meta.wide === true)
</script>

<template>
  <div class="min-h-svh">
    <header class="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div class="mx-auto flex h-12 max-w-[110rem] items-center gap-3 px-3 sm:px-4">
        <RouterLink to="/" class="flex h-7 items-center" aria-label="Pickup start page">
          <PickupLogo />
        </RouterLink>
      </div>
    </header>
    <main v-if="wide">
      <slot />
    </main>
    <main v-else class="mx-auto max-w-6xl px-4 py-8">
      <slot />
    </main>
  </div>
</template>
