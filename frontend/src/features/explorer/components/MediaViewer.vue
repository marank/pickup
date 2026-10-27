<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, PencilIcon, XIcon } from '@lucide/vue'
import { computed, ref } from 'vue'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { formatFileSize } from '@/lib/format'

import { useExplorer } from '../composables/useExplorer'

const explorer = useExplorer()
const files = computed(() => explorer.files)
const item = computed(() => {
  const file = files.value[explorer.viewer.index]
  return file?.kind === 'file' ? file : null
})

function step(delta: number) {
  const count = files.value.length
  if (count) explorer.viewer.index = (explorer.viewer.index + delta + count) % count
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') step(1)
  if (event.key === 'ArrowLeft') step(-1)
}

// Swipe left/right on touch screens.
const swipeStart = ref<number | null>(null)
function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'touch') swipeStart.value = event.clientX
}
function onPointerUp(event: PointerEvent) {
  if (swipeStart.value === null) return
  const distance = event.clientX - swipeStart.value
  swipeStart.value = null
  if (Math.abs(distance) > 50) step(distance < 0 ? 1 : -1)
}

function editCaption() {
  if (!item.value) return
  explorer.viewer.open = false
  explorer.requestRename(item.value)
}
</script>

<template>
  <Dialog v-model:open="explorer.viewer.open">
    <DialogContent
      v-if="item"
      :show-close-button="false"
      class="flex h-dvh max-h-none w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-ink p-0 text-paper sm:max-w-none"
      @keydown="onKey"
    >
      <header class="flex items-center gap-2 px-3 py-2">
        <div class="min-w-0 flex-1">
          <DialogTitle class="truncate text-base font-semibold">{{ item.name }}</DialogTitle>
          <DialogDescription class="text-xs text-paper/70">
            {{ explorer.viewer.index + 1 }} / {{ files.length }} · {{ item.owner }} ·
            {{ formatFileSize(item.size) }}
          </DialogDescription>
        </div>
        <button
          v-if="item.editable"
          type="button"
          class="flex size-9 items-center justify-center rounded-full hover:bg-paper/10"
          aria-label="Edit caption"
          @click="editCaption"
        >
          <PencilIcon class="size-4" />
        </button>
        <a
          :href="item.media.file"
          :download="item.media.original_filename"
          class="flex size-9 items-center justify-center rounded-full hover:bg-paper/10"
          aria-label="Download"
        >
          <DownloadIcon class="size-4" />
        </a>
        <button
          type="button"
          class="flex size-9 items-center justify-center rounded-full hover:bg-paper/10"
          aria-label="Close"
          @click="explorer.viewer.open = false"
        >
          <XIcon class="size-5" />
        </button>
      </header>

      <div
        class="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 select-none"
        data-testid="viewer-stage"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
      >
        <img
          v-if="item.media.is_image"
          :key="item.id"
          :src="item.media.file"
          :alt="item.media.caption || item.name"
          class="max-h-full max-w-full object-contain"
          draggable="false"
        />
        <video
          v-else
          :key="item.id"
          :src="item.media.file"
          controls
          autoplay
          playsinline
          class="max-h-full max-w-full"
        />

        <template v-if="files.length > 1">
          <button
            type="button"
            class="absolute left-2 flex size-11 items-center justify-center rounded-full bg-paper/10 hover:bg-paper/20 max-sm:hidden"
            aria-label="Previous"
            @click="step(-1)"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            class="absolute right-2 flex size-11 items-center justify-center rounded-full bg-paper/10 hover:bg-paper/20 max-sm:hidden"
            aria-label="Next"
            @click="step(1)"
          >
            <ChevronRightIcon />
          </button>
        </template>
      </div>

      <p
        v-if="item.media.caption"
        class="px-4 pt-2 pb-4 text-center text-sm whitespace-pre-line text-paper/90"
      >
        {{ item.media.caption }}
      </p>
      <p v-else-if="files.length > 1" class="px-4 pb-4 text-center text-xs text-paper/50 sm:hidden">
        Swipe for the next one
      </p>
    </DialogContent>
  </Dialog>
</template>
