<script setup lang="ts">
import { computed } from 'vue'

import { formatFileSize } from '@/lib/format'

import { useExplorer } from '../composables/useExplorer'

const explorer = useExplorer()
const own = computed(() => {
  const storage = explorer.pickup.data?.storage
  if (!storage || storage.own_used === null) return ''
  const used = formatFileSize(storage.own_used)
  return storage.own_limit === null ? used : `${used} of ${formatFileSize(storage.own_limit)}`
})
const selectedSize = computed(() =>
  explorer.selectedItems.reduce((sum, item) => sum + (item.size ?? 0), 0),
)
</script>

<template>
  <footer
    class="flex h-7 shrink-0 items-center gap-3 border-t bg-pane px-3 text-xs text-muted-foreground tabular-nums"
    aria-live="polite"
  >
    <span>{{ explorer.items.length }} {{ explorer.items.length === 1 ? 'item' : 'items' }}</span>
    <span v-if="explorer.selection.count">
      {{ explorer.selection.count }} selected<template v-if="selectedSize">
        · {{ formatFileSize(selectedSize) }}</template
      >
    </span>
    <span v-if="explorer.isMember" class="ml-auto truncate max-sm:hidden">
      Your folder: {{ explorer.ownFolder?.name }}<template v-if="own"> · {{ own }}</template>
    </span>
    <span v-else class="ml-auto max-sm:hidden">Viewing only</span>
  </footer>
</template>
