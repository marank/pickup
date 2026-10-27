<script setup lang="ts">
import { FolderIcon, PlayIcon } from '@lucide/vue'
import { computed } from 'vue'

import { ownerColor } from '@/lib/ownerColor'

import type { ExplorerItem } from '../lib/items'

const props = withDefaults(
  defineProps<{ item: ExplorerItem; size?: 'icon' | 'small' | 'large' }>(),
  {
    size: 'small',
  },
)

const color = computed(() => ownerColor(props.item.owner))
</script>

<template>
  <div
    v-if="item.kind === 'folder'"
    class="flex size-full items-center justify-center"
    :style="{ color }"
    data-thumb="folder"
  >
    <FolderIcon
      :class="size === 'icon' ? 'size-5' : size === 'small' ? 'size-12' : 'size-20'"
      fill="currentColor"
      fill-opacity="0.18"
      :stroke-width="size === 'icon' ? 2 : 1.5"
    />
  </div>
  <div v-else class="relative size-full overflow-hidden bg-muted" data-thumb="file">
    <img
      v-if="item.media.is_image"
      :src="item.media.file"
      :alt="item.media.caption || item.name"
      loading="lazy"
      draggable="false"
      class="size-full object-cover"
    />
    <video
      v-else
      :src="`${item.media.file}#t=0.5`"
      preload="metadata"
      muted
      playsinline
      class="size-full object-cover"
    />
    <span
      v-if="item.media.is_video && size !== 'icon'"
      class="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-ink/75 px-1.5 py-0.5 text-[10px] font-medium text-paper"
    >
      <PlayIcon class="size-3" fill="currentColor" />
      Video
    </span>
  </div>
</template>
