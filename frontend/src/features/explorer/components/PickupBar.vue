<script setup lang="ts">
import { HourglassIcon, Share2Icon } from '@lucide/vue'
import { computed } from 'vue'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { useExplorer } from '../composables/useExplorer'
import { usePhone } from '../composables/usePhone'

const explorer = useExplorer()
const phone = usePhone()
const pickup = computed(() => explorer.pickup.data)
const title = computed(() => pickup.value?.title || 'Untitled pickup')
const expires = computed(() =>
  pickup.value?.expires_at
    ? new Date(pickup.value.expires_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : '',
)
</script>

<template>
  <!-- On phones in the header (AppLayout's #header-pickup), so it takes no row of its own. -->
  <Teleport to="#header-pickup" defer :disabled="!phone">
    <div class="flex min-w-0 items-center gap-2 max-sm:flex-1 sm:gap-3">
      <Skeleton v-if="!pickup" class="h-9 w-56 rounded-lg" />
      <!-- Like the logo: the frame around it, the tomato tile (upright here), then the name. -->
      <div
        v-else
        class="flex max-w-full min-w-0 items-center gap-2 rounded-xl border-[3px] border-foreground py-1 pr-3 pl-2.5 max-sm:gap-1.5 max-sm:rounded-lg max-sm:border-2 max-sm:py-0.5 max-sm:pr-2 max-sm:pl-1.5"
      >
        <span
          class="size-4.5 shrink-0 rounded-[0.3rem] bg-tomato max-sm:size-3.5"
          aria-hidden="true"
        />
        <h1 class="truncate text-base leading-tight font-semibold sm:text-xl">{{ title }}</h1>
      </div>

      <component
        :is="pickup?.is_creator ? 'button' : 'span'"
        v-if="expires"
        :type="pickup?.is_creator ? 'button' : undefined"
        class="flex min-w-0 items-center gap-1.5 rounded-full bg-butter/40 px-2.5 py-1 text-xs whitespace-nowrap max-sm:hidden"
        :class="pickup?.is_creator && 'hover:bg-butter/60'"
        :title="`Everything is deleted at the end of ${expires}`"
        @click="pickup?.is_creator && explorer.openPage('settings')"
      >
        <HourglassIcon class="size-3.5 shrink-0" />
        <span class="truncate"><span class="max-sm:hidden">Deleted after </span>{{ expires }}</span>
      </component>

      <div class="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          aria-label="Share"
          @click="explorer.dialog = { kind: 'share' }"
        >
          <Share2Icon />
          <span class="max-sm:hidden">Share</span>
        </Button>
      </div>
    </div>
  </Teleport>
</template>
