<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
import { RouterLink } from 'vue-router'

import { Button } from '@/components/ui/button'
</script>

<template>
  <Button as-child size="lg" class="h-12 px-5 text-base">
    <RouterLink :to="{ name: 'create' }">
      <PlusIcon />
      Start a pickup
    </RouterLink>
  </Button>
</template>
