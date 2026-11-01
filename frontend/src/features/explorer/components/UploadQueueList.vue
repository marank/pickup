<script setup lang="ts">
import { CircleCheckIcon, CircleMinusIcon, CircleXIcon, LoaderCircleIcon } from '@lucide/vue'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatFileSize } from '@/lib/format'
import { t } from '@/lib/i18n'

import type { UploadItem } from '../composables/useUploadQueue'

defineProps<{ items: UploadItem[] }>()
const emit = defineEmits<{ retry: [item: UploadItem]; cancel: [item: UploadItem]; clear: [] }>()

const statusText: Record<UploadItem['status'], () => string> = {
  pending: () => t('explorer.uploadQueueList.waiting'),
  uploading: () => t('explorer.uploadQueueList.uploading'),
  done: () => t('explorer.uploadQueueList.done'),
  skipped: () => t('explorer.uploadQueueList.alreadyThere'),
  error: () => t('explorer.uploadQueueList.failed'),
  cancelled: () => t('explorer.uploadQueueList.cancelled'),
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex justify-end">
      <Button variant="ghost" size="xs" @click="emit('clear')">{{
        t('explorer.uploadQueueList.clearFinished')
      }}</Button>
    </div>
    <ul class="space-y-2">
      <li v-for="item in items" :key="item.id" class="rounded-md border bg-background p-3">
        <div class="flex items-center gap-2 text-sm">
          <LoaderCircleIcon v-if="item.status === 'uploading'" class="size-4 animate-spin" />
          <CircleCheckIcon v-else-if="item.status === 'done'" class="size-4 text-green-600" />
          <CircleMinusIcon
            v-else-if="item.status === 'skipped'"
            class="size-4 text-muted-foreground"
          />
          <CircleXIcon v-else-if="item.status === 'error'" class="size-4 text-destructive" />
          <span class="min-w-0 flex-1 truncate">{{ item.file.name }}</span>
          <Badge v-if="item.chunked" variant="outline">{{
            t('explorer.uploadQueueList.chunked')
          }}</Badge>
          <span class="text-muted-foreground">{{ formatFileSize(item.file.size) }}</span>
          <span class="w-24 text-right text-muted-foreground">{{ statusText[item.status]() }}</span>
          <Button
            v-if="item.status === 'error'"
            size="xs"
            variant="outline"
            @click="emit('retry', item)"
          >
            {{ t('explorer.uploadQueueList.retry') }}
          </Button>
          <Button
            v-if="item.status === 'uploading' || item.status === 'pending'"
            size="xs"
            variant="ghost"
            @click="emit('cancel', item)"
          >
            {{ t('common.cancel') }}
          </Button>
        </div>
        <Progress v-if="item.status === 'uploading'" :model-value="item.progress" class="mt-2" />
        <p
          v-if="item.error"
          class="mt-1 text-sm"
          :class="item.status === 'skipped' ? 'text-muted-foreground' : 'text-destructive'"
        >
          {{ item.error }}
        </p>
      </li>
    </ul>
  </div>
</template>
