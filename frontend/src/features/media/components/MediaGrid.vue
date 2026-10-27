<script setup lang="ts">
import { ImageOffIcon, PencilIcon, PlayIcon, Trash2Icon } from '@lucide/vue'
import { ref } from 'vue'

import type { Media } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import MediaPreviewDialog from './MediaPreviewDialog.vue'

withDefaults(
  defineProps<{ media: Media[]; loading?: boolean; emptyMessage: string; editable?: boolean }>(),
  { loading: false, editable: false },
)
const emit = defineEmits<{ editCaption: [media: Media]; delete: [media: Media] }>()

const previewOpen = ref(false)
const previewed = ref<Media | null>(null)

function preview(media: Media) {
  previewed.value = media
  previewOpen.value = true
}
</script>

<template>
  <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
    <Skeleton v-for="n in 8" :key="n" class="aspect-square rounded-lg" />
  </div>

  <div
    v-else-if="media.length === 0"
    class="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center text-muted-foreground"
  >
    <ImageOffIcon class="size-8" />
    <p>{{ emptyMessage }}</p>
  </div>

  <ul v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
    <li
      v-for="item in media"
      :key="item.id"
      class="group overflow-hidden rounded-lg border bg-background"
    >
      <button
        type="button"
        class="relative block aspect-square w-full bg-muted"
        :aria-label="`Show ${item.original_filename}`"
        @click="preview(item)"
      >
        <img
          v-if="item.is_image"
          :src="item.file"
          :alt="item.caption || item.original_filename"
          loading="lazy"
          class="size-full object-cover"
        />
        <template v-else>
          <video :src="item.file" preload="metadata" muted class="size-full object-cover" />
          <PlayIcon
            class="absolute inset-0 m-auto size-10 rounded-full bg-black/50 p-2 text-white"
          />
        </template>
      </button>
      <div class="flex items-start gap-2 p-2">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium" :title="item.original_filename">
            {{ item.original_filename }}
          </p>
          <p v-if="item.caption" class="line-clamp-2 text-sm text-muted-foreground">
            {{ item.caption }}
          </p>
          <p class="text-xs text-muted-foreground">{{ item.file_size_display }}</p>
        </div>
        <div v-if="editable && item.can_edit" class="flex shrink-0">
          <Button
            variant="ghost"
            size="icon-xs"
            :aria-label="`Edit caption of ${item.original_filename}`"
            @click="emit('editCaption', item)"
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            :aria-label="`Delete ${item.original_filename}`"
            @click="emit('delete', item)"
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
    </li>
  </ul>

  <MediaPreviewDialog v-model:open="previewOpen" :media="previewed" />
</template>
