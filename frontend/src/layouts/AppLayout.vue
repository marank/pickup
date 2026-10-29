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
    <header
      v-if="!route.meta.bare"
      class="sticky top-0 z-30 border-b bg-background/85 backdrop-blur"
    >
      <!-- In a pickup as wide as the explorer below it. -->
      <div
        class="mx-auto flex h-12 items-center gap-3 px-3 sm:px-4"
        :class="!pickupId && 'max-w-[110rem]'"
      >
        <HomeLink />
        <!-- On phones the explorer puts the pickup's title and Share here (PickupBar). -->
        <div
          v-if="pickupId"
          id="header-pickup"
          class="flex min-w-0 flex-1 items-center sm:hidden"
        />
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
