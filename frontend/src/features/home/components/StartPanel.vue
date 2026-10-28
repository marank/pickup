<script setup lang="ts">
import { LinkIcon, PlusIcon } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'

const router = useRouter()
const link = ref('')

/** Accepts the pickup code or a whole share link. */
function pickupIdFrom(value: string): string {
  const match = value.match(/\/pickup\/([^/?#]+)/)
  return (match?.[1] ?? value).trim()
}

function openLink() {
  const pickupId = pickupIdFrom(link.value)
  if (pickupId) router.push({ name: 'explorer', params: { pickupId } })
}
</script>

<template>
  <div class="space-y-4">
    <Button as-child size="lg" class="h-12 px-5 text-base">
      <RouterLink :to="{ name: 'create' }">
        <PlusIcon />
        Start a pickup
      </RouterLink>
    </Button>
    <form class="flex max-w-md gap-2" @submit.prevent="openLink">
      <label class="relative flex-1">
        <LinkIcon
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          v-model="link"
          placeholder="Got a link? Paste it here"
          aria-label="Share link"
          class="h-10 w-full rounded-lg border bg-card pr-3 pl-9 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring/40"
        />
      </label>
      <Button type="submit" variant="secondary" class="h-10" :disabled="!link.trim()">Open</Button>
    </form>
  </div>
</template>
