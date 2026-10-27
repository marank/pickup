<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import PickupLogo from '@/components/PickupLogo.vue'
import ThemeMenu from '@/components/ThemeMenu.vue'
import AccountMenu from '@/features/pickups/components/AccountMenu.vue'

const route = useRoute()
const wide = computed(() => route.meta.wide === true)
const pickupId = computed(() =>
  typeof route.params.pickupId === 'string' ? route.params.pickupId : null,
)
</script>

<template>
  <div class="min-h-svh">
    <header class="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div class="mx-auto flex h-12 max-w-[110rem] items-center gap-3 px-3 sm:px-4">
        <RouterLink to="/" class="flex h-7 items-center" aria-label="Pickup start page">
          <PickupLogo />
        </RouterLink>
        <div class="ml-auto flex items-center gap-1">
          <AccountMenu v-if="pickupId" :pickup-id="pickupId" />
          <ThemeMenu v-else />
        </div>
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
