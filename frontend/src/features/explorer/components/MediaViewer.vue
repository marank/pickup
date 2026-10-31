<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, PencilIcon, XIcon } from '@lucide/vue'
import { computed, ref, watch } from 'vue'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { formatFileSize } from '@/lib/format'

import { useExplorer } from '../composables/useExplorer'
import { useViewerGestures } from '../composables/useViewerGestures'

const explorer = useExplorer()
const files = computed(() => explorer.files)
const at = (index: number) => {
  const count = files.value.length
  const file = files.value[(index + count) % count]
  return file?.kind === 'file' ? file : null
}
const item = computed(() => at(explorer.viewer.index))
/** The current file and its neighbours, side by side, so swiping shows the next one coming. */
const slides = computed(() =>
  files.value.length > 1
    ? ([-1, 0, 1] as const).map((position) => ({
        position,
        file: at(explorer.viewer.index + position),
      }))
    : [{ position: 0 as const, file: item.value }],
)

function step(delta: number) {
  const count = files.value.length
  if (count) explorer.viewer.index = (explorer.viewer.index + delta + count) % count
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') step(1)
  if (event.key === 'ArrowLeft') step(-1)
}

const stage = ref<HTMLElement | null>(null)
// Set by a function ref: a plain ref inside v-for would collect an array.
let picture: HTMLElement | null = null
const setPicture = (el: unknown) => (picture = el instanceof HTMLElement ? el : null)
const gestures = useViewerGestures({
  stage,
  picture: () => (item.value?.media.is_image ? picture : null),
  count: () => files.value.length,
  step,
  close: () => (explorer.viewer.open = false),
})
watch(
  () => [explorer.viewer.index, explorer.viewer.open],
  () => gestures.reset(),
)

function editCaption() {
  if (!item.value) return
  explorer.viewer.open = false
  explorer.requestRename(item.value)
}

const button =
  'flex size-9 items-center justify-center rounded-full hover:bg-paper/10 pointer-coarse:size-11'
</script>

<template>
  <Dialog v-model:open="explorer.viewer.open">
    <DialogContent
      v-if="item"
      :show-close-button="false"
      class="flex h-dvh max-h-none w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-transparent p-0 text-paper sm:max-w-none"
      @keydown="onKey"
    >
      <div
        class="absolute inset-0 -z-10 bg-stage"
        :style="{ opacity: gestures.backdropOpacity.value }"
      />
      <header
        class="flex items-center gap-2 px-3 py-2 transition-opacity"
        :class="gestures.barsHidden.value && 'pointer-events-none opacity-0'"
      >
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
          :class="button"
          aria-label="Edit caption"
          @click="editCaption"
        >
          <PencilIcon class="size-4" />
        </button>
        <a
          :href="item.media.file"
          :download="item.media.original_filename"
          :class="button"
          aria-label="Download"
        >
          <DownloadIcon class="size-4" />
        </a>
        <button
          type="button"
          :class="button"
          aria-label="Close"
          @click="explorer.viewer.open = false"
        >
          <XIcon class="size-5" />
        </button>
      </header>

      <!-- touch-none: the viewer handles every touch itself (swipe, pinch, double-tap). -->
      <div
        ref="stage"
        class="relative min-h-0 flex-1 touch-none overflow-hidden select-none"
        data-testid="viewer-stage"
        v-on="gestures.handlers"
      >
        <div class="absolute inset-0" :style="gestures.stripStyle.value">
          <div
            v-for="slide in slides"
            :key="slide.position"
            class="absolute inset-0 flex items-center justify-center px-2"
            :style="{ transform: `translateX(${slide.position * 100}%)` }"
            :aria-hidden="slide.position !== 0"
          >
            <template v-if="slide.file && slide.position === 0">
              <img
                v-if="slide.file.media.is_image"
                :ref="setPicture"
                :key="slide.file.id"
                :src="slide.file.media.file"
                :alt="slide.file.media.caption || slide.file.name"
                class="max-h-full max-w-full object-contain will-change-transform"
                :style="gestures.pictureStyle.value"
                draggable="false"
              />
              <video
                v-else
                :key="slide.file.id"
                :src="slide.file.media.file"
                controls
                autoplay
                playsinline
                class="max-h-full max-w-full"
              />
            </template>
            <!-- Neighbours: the picture itself (it is next anyway), for videos their still. -->
            <img
              v-else-if="slide.file?.media.is_image || slide.file?.media.thumbnail"
              :src="slide.file.media.is_image ? slide.file.media.file : slide.file.media.thumbnail!"
              alt=""
              class="max-h-full max-w-full object-contain"
              draggable="false"
            />
          </div>
        </div>

        <template v-if="files.length > 1">
          <button
            type="button"
            class="absolute top-1/2 left-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/10 hover:bg-paper/20 pointer-coarse:hidden"
            aria-label="Previous"
            @click="step(-1)"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            class="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/10 hover:bg-paper/20 pointer-coarse:hidden"
            aria-label="Next"
            @click="step(1)"
          >
            <ChevronRightIcon />
          </button>
        </template>
      </div>

      <div
        class="transition-opacity"
        :class="gestures.barsHidden.value && 'pointer-events-none opacity-0'"
      >
        <p
          v-if="item.media.caption"
          class="px-4 pt-2 pb-4 text-center text-sm whitespace-pre-line text-paper/90"
        >
          {{ item.media.caption }}
        </p>
        <p
          v-else-if="files.length > 1"
          class="hidden px-4 pb-4 text-center text-xs text-paper/50 pointer-coarse:block"
        >
          Swipe for the next one · pinch to zoom · swipe down to close
        </p>
      </div>
    </DialogContent>
  </Dialog>
</template>
