<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import HomeLink from '@/components/HomeLink.vue'
import ThemeMenu from '@/components/ThemeMenu.vue'
import AccountMenu from '@/features/pickups/components/AccountMenu.vue'

const route = useRoute()
const pickupId = computed(() =>
  typeof route.params.pickupId === 'string' ? route.params.pickupId : null,
)
</script>

<template>
  <div class="min-h-svh">
    <header class="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div class="mx-auto flex h-12 max-w-[110rem] items-center gap-3 px-3 sm:px-4">
        <HomeLink />
        <div class="ml-auto flex items-center gap-1">
          <AccountMenu v-if="pickupId" :pickup-id="pickupId" />
          <ThemeMenu v-else />
        </div>
      </div>
    </header>
    <!-- The page width comes with each page (App.vue), so it can fade out with it. -->
    <main>
      <slot />
    </main>
  </div>
</template>
