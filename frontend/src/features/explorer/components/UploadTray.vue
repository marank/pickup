<script setup lang="ts">
import { ChevronDownIcon, ChevronUpIcon, UploadIcon } from '@lucide/vue'
import { computed, ref } from 'vue'

import { Progress } from '@/components/ui/progress'

import { useExplorer } from '../composables/useExplorer'
import UploadQueueList from './UploadQueueList.vue'

const explorer = useExplorer()
const open = ref(true)
const queue = computed(() => explorer.uploads)
const total = computed(() => queue.value.items.length)
const progress = computed(() =>
  total.value
    ? Math.round(
        queue.value.items.reduce(
          (sum, item) => sum + (item.status === 'done' ? 100 : item.progress),
          0,
        ) / total.value,
      )
    : 0,
)
const title = computed(() =>
  queue.value.busy
    ? `Uploading ${queue.value.finished + 1} of ${total.value}`
    : `${queue.value.finished} of ${total.value} uploaded`,
)
</script>

<template>
  <div
    v-if="total"
    class="fixed right-3 bottom-3 left-3 z-40 overflow-hidden rounded-xl border bg-card shadow-lg sm:left-auto sm:w-96"
    role="region"
    aria-label="Uploads"
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
    <Progress v-if="queue.busy" :model-value="progress" class="h-1 rounded-none" />
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
