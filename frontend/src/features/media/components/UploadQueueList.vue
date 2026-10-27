<script setup lang="ts">
import { CircleCheckIcon, CircleXIcon, LoaderCircleIcon } from '@lucide/vue'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatFileSize } from '@/lib/format'

import type { UploadItem } from '../composables/useUploadQueue'

defineProps<{ items: UploadItem[] }>()
const emit = defineEmits<{ retry: [item: UploadItem]; cancel: [item: UploadItem]; clear: [] }>()

const statusText: Record<UploadItem['status'], string> = {
  pending: 'Waiting',
  uploading: 'Uploading',
  done: 'Done',
  error: 'Failed',
  cancelled: 'Cancelled',
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium">Uploads</h3>
      <Button variant="ghost" size="xs" @click="emit('clear')">Clear finished</Button>
    </div>
    <ul class="space-y-2">
      <li v-for="item in items" :key="item.id" class="rounded-md border bg-background p-3">
        <div class="flex items-center gap-2 text-sm">
          <LoaderCircleIcon v-if="item.status === 'uploading'" class="size-4 animate-spin" />
          <CircleCheckIcon v-else-if="item.status === 'done'" class="size-4 text-green-600" />
          <CircleXIcon v-else-if="item.status === 'error'" class="size-4 text-destructive" />
          <span class="min-w-0 flex-1 truncate">{{ item.file.name }}</span>
          <Badge v-if="item.chunked" variant="outline">chunked</Badge>
          <span class="text-muted-foreground">{{ formatFileSize(item.file.size) }}</span>
          <span class="w-20 text-right text-muted-foreground">{{ statusText[item.status] }}</span>
          <Button
            v-if="item.status === 'error'"
            size="xs"
            variant="outline"
            @click="emit('retry', item)"
          >
            Retry
          </Button>
          <Button
            v-if="item.status === 'uploading' || item.status === 'pending'"
            size="xs"
            variant="ghost"
            @click="emit('cancel', item)"
          >
            Cancel
          </Button>
        </div>
        <Progress v-if="item.status === 'uploading'" :model-value="item.progress" class="mt-2" />
        <p v-if="item.error" class="mt-1 text-sm text-destructive">{{ item.error }}</p>
      </li>
    </ul>
  </div>
</template>
