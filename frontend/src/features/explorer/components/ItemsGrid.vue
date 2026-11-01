<script setup lang="ts">
import { computed } from 'vue'

import { formatFileSize, formatRelativeDate } from '@/lib/format'
import { plural, t } from '@/lib/i18n'

import { useExplorer } from '../composables/useExplorer'
import { useItemPointer } from '../composables/useItemPointer'
import { typeLabel, type ExplorerItem } from '../lib/items'
import ItemContextMenu from './ItemContextMenu.vue'
import ItemMenu from './ItemMenu.vue'
import ItemThumb from './ItemThumb.vue'
import OwnBadge from './OwnBadge.vue'

const props = defineProps<{ variant: 'content' | 'small' | 'large' }>()
const explorer = useExplorer()
const { onPointerDown, onClick, onDoubleClick } = useItemPointer()

/** Second line: what's inside a folder; a file's caption, else who added it. */
function subtitle(item: ExplorerItem): string {
  if (item.kind === 'file') return item.media.caption || item.owner
  return count(item)
}
const count = (item: Extract<ExplorerItem, { kind: 'folder' }>) =>
  plural(item.folder.subfolder_count + item.folder.media_count, '1 item', '{n} items')

const layout = computed(
  () =>
    ({
      small:
        'grid grid-cols-4 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] sm:gap-2',
      large: 'grid grid-cols-3 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-3',
      content: 'flex flex-col gap-1',
    })[props.variant],
)
</script>

<template>
  <ul :class="layout" role="listbox" aria-multiselectable="true" :aria-label="t('Folder contents')">
    <ItemContextMenu v-for="item in explorer.items" :key="item.id" :item="item">
      <li
        role="option"
        :aria-selected="explorer.selection.isSelected(item.id)"
        :data-item="item.id"
        :title="item.name"
        class="group relative cursor-default rounded-lg border border-transparent outline-none select-none hover:bg-muted/70 aria-selected:border-selection-border aria-selected:bg-selection"
        :class="variant === 'content' ? 'flex items-center gap-3 p-2' : 'flex flex-col p-1.5'"
        @pointerdown="onPointerDown"
        @click="onClick(item, $event)"
        @dblclick="onDoubleClick(item)"
      >
        <div
          class="shrink-0 overflow-hidden rounded-md"
          :class="{
            'aspect-square w-full': variant !== 'content',
            'size-14': variant === 'content',
            'bg-pane': item.kind === 'folder',
          }"
        >
          <ItemThumb :item="item" :size="variant === 'large' ? 'large' : 'small'" />
        </div>

        <div v-if="variant === 'content'" class="min-w-0 flex-1">
          <p class="flex min-w-0 items-center gap-1.5 font-medium">
            <span class="truncate">{{ item.name }}</span>
            <OwnBadge v-if="explorer.ownFolder?.id === item.id" />
          </p>
          <p
            v-if="item.kind === 'file' && item.media.caption"
            class="truncate text-sm text-muted-foreground"
          >
            {{ item.media.caption }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ typeLabel(item) }} · {{ item.owner }} · {{ formatRelativeDate(item.date) }}
            <template v-if="item.size !== null"> · {{ formatFileSize(item.size) }}</template>
            <template v-else> · {{ count(item) }}</template>
          </p>
        </div>
        <div v-else class="px-1 pt-1.5 pb-0.5">
          <p
            class="line-clamp-2 text-center text-sm leading-tight break-words"
            :class="variant === 'small' && 'text-xs'"
          >
            {{ item.name }}
          </p>
          <p v-if="explorer.ownFolder?.id === item.id" class="mt-1 text-center">
            <OwnBadge />
          </p>
          <p
            v-if="variant === 'large'"
            class="mt-0.5 truncate text-center text-xs text-muted-foreground"
          >
            {{ subtitle(item) }}
          </p>
        </div>

        <div
          class="opacity-0 group-hover:opacity-100 group-aria-selected:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100"
          :class="
            variant === 'content' ? '' : 'absolute top-2 right-2 rounded-md bg-card/90 shadow-sm'
          "
        >
          <ItemMenu :item="item" />
        </div>
      </li>
    </ItemContextMenu>
  </ul>
</template>
