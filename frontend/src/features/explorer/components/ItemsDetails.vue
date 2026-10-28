<script setup lang="ts">
import { ArrowDownIcon, ArrowUpIcon } from '@lucide/vue'

import { formatFileSize, formatRelativeDate } from '@/lib/format'

import { useExplorer } from '../composables/useExplorer'
import { useItemPointer } from '../composables/useItemPointer'
import { typeLabel, type SortKey } from '../lib/items'
import ItemContextMenu from './ItemContextMenu.vue'
import ItemMenu from './ItemMenu.vue'
import ItemThumb from './ItemThumb.vue'
import OwnBadge from './OwnBadge.vue'

const explorer = useExplorer()
const { onClick, onDoubleClick } = useItemPointer()

const columns: { key: SortKey; label: string; class: string }[] = [
  { key: 'name', label: 'Name', class: 'w-full' },
  { key: 'owner', label: 'Owner', class: 'max-sm:hidden w-36' },
  { key: 'date', label: 'Added', class: 'max-md:hidden w-32' },
  { key: 'type', label: 'Type', class: 'max-lg:hidden w-32' },
  { key: 'size', label: 'Size', class: 'w-24 text-right' },
]
</script>

<template>
  <table
    class="w-full table-fixed text-sm"
    aria-label="Folder contents"
    aria-multiselectable="true"
  >
    <thead class="sticky top-0 z-10 bg-card text-left text-xs text-muted-foreground">
      <tr class="border-b">
        <th
          v-for="column in columns"
          :key="column.key"
          :class="column.class"
          class="p-0 font-medium"
        >
          <button
            type="button"
            class="flex w-full items-center gap-1 px-2 py-2 hover:text-foreground"
            :class="column.key === 'size' && 'justify-end'"
            :aria-sort="
              explorer.prefs.sortKey === column.key
                ? explorer.prefs.sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            "
            @click="explorer.prefs.sortBy(column.key)"
          >
            {{ column.label }}
            <template v-if="explorer.prefs.sortKey === column.key">
              <ArrowUpIcon v-if="explorer.prefs.sortDirection === 'asc'" class="size-3" />
              <ArrowDownIcon v-else class="size-3" />
            </template>
          </button>
        </th>
        <th class="w-10"><span class="sr-only">Actions</span></th>
      </tr>
    </thead>
    <tbody>
      <ItemContextMenu v-for="item in explorer.items" :key="item.id" :item="item">
        <tr
          :aria-selected="explorer.selection.isSelected(item.id)"
          :data-item="item.id"
          class="group cursor-default border-b border-border/60 select-none hover:bg-muted/70 aria-selected:bg-selection"
          @click="onClick(item, $event)"
          @dblclick="onDoubleClick(item)"
        >
          <td class="px-2 py-1.5">
            <div class="flex min-w-0 items-center gap-2.5">
              <span
                class="size-7 shrink-0 overflow-hidden rounded"
                :class="item.kind === 'folder' && 'bg-transparent'"
              >
                <ItemThumb :item="item" size="icon" />
              </span>
              <span class="truncate">{{ item.name }}</span>
              <OwnBadge v-if="explorer.ownFolder?.id === item.id" />
            </div>
          </td>
          <td class="truncate px-2 text-muted-foreground max-sm:hidden">{{ item.owner }}</td>
          <td class="px-2 text-muted-foreground max-md:hidden">
            {{ formatRelativeDate(item.date) }}
          </td>
          <td class="truncate px-2 text-muted-foreground max-lg:hidden">{{ typeLabel(item) }}</td>
          <td class="px-2 text-right text-muted-foreground tabular-nums">
            {{ item.size === null ? '' : formatFileSize(item.size) }}
          </td>
          <td class="pr-1 text-right">
            <div
              class="opacity-0 group-hover:opacity-100 group-aria-selected:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <ItemMenu :item="item" />
            </div>
          </td>
        </tr>
      </ItemContextMenu>
    </tbody>
  </table>
</template>
