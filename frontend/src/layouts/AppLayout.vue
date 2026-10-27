<script setup lang="ts">
import { PackageOpenIcon } from '@lucide/vue'
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-svh bg-muted/40">
    <header class="border-b bg-background">
      <div class="mx-auto flex h-14 max-w-6xl items-center px-4">
        <RouterLink to="/" class="flex items-center gap-2 font-semibold">
          <PackageOpenIcon class="size-5" />
          Pickup
        </RouterLink>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-8">
      <slot />
    </main>
  </div>
</template>
