<script setup lang="ts">
import { CrownIcon, PencilIcon, Share2Icon } from '@lucide/vue'
import { computed } from 'vue'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ownerColor } from '@/lib/ownerColor'

import { useExplorer } from '../composables/useExplorer'

const explorer = useExplorer()
const pickup = computed(() => explorer.pickup.data)
const title = computed(() => pickup.value?.title || 'Untitled pickup')
</script>

<template>
  <div class="flex items-center gap-2 sm:gap-3">
    <Skeleton v-if="!pickup" class="h-9 w-56 rounded-lg" />
    <div
      v-else
      class="tag-hole flex max-w-full min-w-0 items-center gap-1 rounded-lg rounded-l-2xl bg-ink py-1.5 pr-1.5 pl-7 text-paper shadow-sm"
    >
      <h1 class="truncate text-base leading-tight font-semibold sm:text-xl">{{ title }}</h1>
      <button
        v-if="pickup.is_creator"
        type="button"
        class="flex size-7 shrink-0 items-center justify-center rounded-md text-paper/70 hover:bg-paper/10 hover:text-paper"
        aria-label="Rename pickup"
        @click="explorer.dialog = { kind: 'rename-pickup', title: pickup.title ?? '' }"
      >
        <PencilIcon class="size-3.5" />
      </button>
    </div>

    <span
      v-if="pickup?.is_creator"
      class="inline-flex shrink-0 items-center gap-1 rounded-full bg-butter/40 px-2.5 py-1 text-xs font-medium max-sm:hidden"
    >
      <CrownIcon class="size-3.5" />
      Creator
    </span>
    <span
      v-if="explorer.ownFolder"
      class="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs"
    >
      <span
        class="size-2 rounded-full"
        :style="{ background: ownerColor(explorer.ownFolder.user_name) }"
      />
      You: {{ explorer.ownFolder.user_name }}
    </span>
    <span
      v-else-if="explorer.folders.isSuccess"
      class="inline-flex items-center rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground"
    >
      Viewing
    </span>

    <Button
      variant="outline"
      size="sm"
      class="ml-auto"
      aria-label="Share"
      @click="explorer.dialog = { kind: 'share' }"
    >
      <Share2Icon />
      <span class="max-sm:hidden">Share</span>
    </Button>
  </div>
</template>
