<script setup lang="ts">
import { ChevronDownIcon, ChevronUpIcon, UploadIcon } from '@lucide/vue'
import { useResizeObserver } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { Progress } from '@/components/ui/progress'
import { plural, t } from '@/lib/i18n'

import { useExplorer } from '../composables/useExplorer'
import { UPLOAD_LIST_HIDE_MS } from '../composables/useUploadQueue'
import UploadQueueList from './UploadQueueList.vue'

const explorer = useExplorer()
// Collapsed by default: the title and the progress bar say enough; a tap shows the files.
const open = ref(false)
const queue = computed(() => explorer.uploads)
const total = computed(() => queue.value.items.length)
const progress = computed(() =>
  total.value
    ? Math.round(
        queue.value.items.reduce(
          (sum, item) =>
            sum + (item.status === 'done' || item.status === 'skipped' ? 100 : item.progress),
          0,
        ) / total.value,
      )
    : 0,
)
// The phone's upload button (UploadFab) sits above the list while it is shown.
const tray = ref<HTMLElement | null>(null)
const setHeight = (px: number) =>
  document.documentElement.style.setProperty('--upload-tray-height', `${px}px`)
useResizeObserver(tray, ([entry]) => setHeight(entry ? entry.contentRect.height + 12 : 0))
// The observer says nothing when the list goes away (cleared): the button would stay up high.
watch(tray, (el) => {
  if (!el) setHeight(0)
})
onBeforeUnmount(() => setHeight(0))

const failed = computed(() => queue.value.items.filter((item) => item.status === 'error').length)
const skipped = computed(() => queue.value.items.filter((item) => item.status === 'skipped').length)
const title = computed(() => {
  const counts = { done: queue.value.finished, total: total.value }
  if (queue.value.busy)
    return t('explorer.uploadTray.uploadingCurrentOfTotal', { ...counts, current: counts.done + 1 })
  if (failed.value === total.value)
    return plural(failed.value, 'explorer.uploadTray.nUploadsFailed')
  return skipped.value
    ? t('explorer.uploadTray.doneOfTotalUploadedSkipped', {
        ...counts,
        skipped: skipped.value,
      })
    : t('explorer.uploadTray.doneOfTotalUploaded', counts)
})

// A finished batch says so for a moment, then the list goes away by itself. Failed uploads
// stay (to retry or dismiss); while the list is open, it waits until it is closed.
let hideTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => [queue.value.busy, open.value, total.value - failed.value] as const,
  ([busy, isOpen, settled]) => {
    clearTimeout(hideTimer)
    if (!busy && !isOpen && settled > 0)
      hideTimer = setTimeout(() => queue.value.clearDone(), UPLOAD_LIST_HIDE_MS)
  },
)
onBeforeUnmount(() => clearTimeout(hideTimer))
// Every new batch starts collapsed again.
watch(total, (count) => count || (open.value = false))
</script>

<template>
  <div
    v-if="total"
    ref="tray"
    class="fixed right-3 bottom-3 left-3 z-40 overflow-hidden rounded-xl border bg-card shadow-lg sm:left-auto sm:w-96"
    role="region"
    :aria-label="t('explorer.uploadTray.uploads')"
  >
    <button
      type="button"
      class="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      :aria-expanded="open"
      @click="open = !open"
    >
      <UploadIcon class="size-4 text-tomato" />
      <span class="flex-1 text-sm font-medium">{{ title }}</span>
      <ChevronDownIcon v-if="open" class="size-4" />
      <ChevronUpIcon v-else class="size-4" />
    </button>
    <Progress
      v-if="queue.busy"
      :model-value="progress"
      :aria-label="t('explorer.uploadTray.uploads')"
      class="h-1 rounded-none"
    />
    <div v-if="open" class="max-h-72 overflow-y-auto border-t p-2">
      <UploadQueueList
        :items="queue.items"
        @retry="queue.retry"
        @cancel="queue.cancel"
        @clear="queue.clearFinished"
      />
    </div>
  </div>
</template>
