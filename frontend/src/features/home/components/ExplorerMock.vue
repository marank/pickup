<script setup lang="ts">
import { FolderIcon } from '@lucide/vue'

import PickupMark from '@/components/PickupMark.vue'
import { t } from '@/lib/i18n'

// A drawn, non-interactive preview of the explorer for the start page.
const folders = [
  { name: () => 'Alice', color: 'var(--owner-1)', open: true },
  { name: () => t('Beach day'), color: 'var(--owner-1)', depth: 1, current: true },
  { name: () => 'Ben', color: 'var(--owner-2)' },
  { name: () => 'Chloé', color: 'var(--owner-3)' },
  { name: () => t('Grandma'), color: 'var(--owner-5)' },
]
const tiles = [
  'from-[oklch(0.8_0.1_60)] to-[oklch(0.65_0.15_35)]',
  'from-[oklch(0.82_0.08_200)] to-[oklch(0.6_0.1_230)]',
  'from-[oklch(0.85_0.1_95)] to-[oklch(0.7_0.12_140)]',
  'from-[oklch(0.75_0.08_30)] to-[oklch(0.5_0.1_10)]',
  'from-[oklch(0.86_0.06_80)] to-[oklch(0.72_0.1_60)]',
  'from-[oklch(0.7_0.06_180)] to-[oklch(0.45_0.06_200)]',
]
</script>

<template>
  <div
    aria-hidden="true"
    class="overflow-hidden rounded-xl border bg-card text-[11px] shadow-xl shadow-ink/10 select-none"
  >
    <div class="flex items-center gap-1.5 border-b bg-pane px-2.5 py-2">
      <span class="size-2.5 rounded-full bg-tomato/70" />
      <span class="size-2.5 rounded-full bg-butter" />
      <span class="size-2.5 rounded-full bg-sage" />
      <div
        class="ml-2 flex flex-1 items-center gap-1 rounded-md border bg-card px-2 py-1 text-muted-foreground"
      >
        <PickupMark class="size-3" />
        {{ t('Summer party') }} <span>›</span> Alice <span>›</span>
        <span class="font-semibold text-foreground">{{ t('Beach day') }}</span>
      </div>
    </div>
    <div class="flex">
      <div class="w-32 shrink-0 space-y-0.5 border-r bg-pane p-2 max-sm:hidden">
        <div class="flex items-center gap-1 px-1 py-0.5 font-medium">
          <PickupMark class="size-3" />
          {{ t('Summer party') }}
        </div>
        <div
          v-for="(folder, index) in folders"
          :key="index"
          class="flex items-center gap-1 rounded px-1 py-0.5"
          :class="folder.current && 'bg-selection font-medium'"
          :style="{ paddingLeft: `${(folder.depth ?? 0) * 0.6 + 0.6}rem` }"
        >
          <FolderIcon
            class="size-3"
            :style="{ color: folder.color }"
            fill="currentColor"
            fill-opacity="0.2"
          />
          {{ folder.name() }}
        </div>
      </div>
      <div class="grid flex-1 grid-cols-3 gap-2 p-2.5">
        <div v-for="(tile, index) in tiles" :key="index" class="space-y-1">
          <div
            class="aspect-square rounded-md bg-linear-to-br"
            :class="[
              tile,
              index === 1 && 'ring-2 ring-selection-border ring-offset-2 ring-offset-card',
            ]"
          />
          <div class="mx-auto h-1.5 w-3/4 rounded-full bg-muted" />
        </div>
      </div>
    </div>
    <div class="flex justify-between border-t bg-pane px-2.5 py-1 text-muted-foreground">
      <span>{{ t('6 items · 1 selected') }}</span>
      <span>{{ t('You: {name}', { name: 'Alice' }) }}</span>
    </div>
  </div>
</template>
