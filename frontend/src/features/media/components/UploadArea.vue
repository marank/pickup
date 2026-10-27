<script setup lang="ts">
import { UploadIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'

import { useUploadQueue } from '../composables/useUploadQueue'
import CaptionDialog from './CaptionDialog.vue'
import UploadQueueList from './UploadQueueList.vue'

const props = defineProps<{ pickupId: string; folderId: string }>()

const queue = useUploadQueue(
  () => props.pickupId,
  () => props.folderId,
)
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

// Files waiting for their caption; the first one is shown in the dialog.
const awaitingCaption = ref<File[]>([])
const current = computed(() => awaitingCaption.value[0] ?? null)
const previewUrl = ref('')
// New key per file, so the dialog starts with an empty caption each time.
const dialogKey = ref(0)
const captionOpen = computed({
  get: () => current.value !== null,
  set: () => {},
})

function showNext() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = current.value ? URL.createObjectURL(current.value) : ''
  dialogKey.value++
}

function addFiles(files: File[]) {
  const accepted = files.filter((file) => {
    const ok = file.type.startsWith('image/') || file.type.startsWith('video/')
    if (!ok) toast.error(`${file.name} is not an image or video`)
    return ok
  })
  if (accepted.length === 0) return
  const wasEmpty = awaitingCaption.value.length === 0
  awaitingCaption.value.push(...accepted)
  if (wasEmpty) showNext()
}

function startUpload(caption: string) {
  const file = awaitingCaption.value.shift()
  if (file) void queue.add(file, caption)
  showNext()
}

function onDrop(event: DragEvent) {
  dragging.value = false
  addFiles(Array.from(event.dataTransfer?.files ?? []))
}

function onSelect(event: Event) {
  const input = event.target as HTMLInputElement
  addFiles(Array.from(input.files ?? []))
  input.value = ''
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed bg-background p-8 text-center transition-colors"
      :class="dragging ? 'border-primary bg-primary/5' : 'border-border'"
      data-testid="dropzone"
      @dragenter.prevent="dragging = true"
      @dragover.prevent
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <UploadIcon class="size-8 text-muted-foreground" />
      <div>
        <p class="font-medium">Drop photos and videos here</p>
        <p class="text-sm text-muted-foreground">
          Large files are uploaded in chunks, so even many GB work.
        </p>
      </div>
      <Button variant="outline" @click="fileInput?.click()">Choose files</Button>
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*,video/*"
        class="hidden"
        data-testid="file-input"
        @change="onSelect"
      />
    </div>

    <UploadQueueList
      v-if="queue.items.value.length"
      :items="queue.items.value"
      @retry="queue.retry"
      @cancel="queue.cancel"
      @clear="queue.clearFinished"
    />

    <CaptionDialog
      :key="dialogKey"
      v-model:open="captionOpen"
      :title="current ? `Caption for ${current.name}` : ''"
      description="Optional. You can also add or change it later."
      confirm-label="Upload"
      cancel-label="Upload without caption"
      :preview-url="previewUrl"
      :preview-is-image="current?.type.startsWith('image/') ?? true"
      @confirm="startUpload"
      @cancel="startUpload('')"
    />
  </div>
</template>
