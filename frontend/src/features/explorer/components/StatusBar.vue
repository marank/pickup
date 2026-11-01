<script setup lang="ts">
import { computed } from 'vue'

import { formatFileSize } from '@/lib/format'
import { plural, t } from '@/lib/i18n'

import { useExplorer } from '../composables/useExplorer'

const explorer = useExplorer()
const own = computed(() => {
  const storage = explorer.pickup.data?.storage
  if (!storage || storage.own_used === null) return ''
  const used = formatFileSize(storage.own_used)
  return storage.own_limit === null
    ? used
    : t('common.usedOfLimit', { used, limit: formatFileSize(storage.own_limit) })
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
    <span>{{ plural(explorer.items.length, 'common.nItems') }}</span>
    <span v-if="explorer.selection.count">
      {{ t('common.nSelected', { n: explorer.selection.count })
      }}<template v-if="selectedSize"> · {{ formatFileSize(selectedSize) }}</template>
    </span>
    <span v-if="explorer.isMember" class="ml-auto truncate max-sm:hidden">
      {{ t('common.yourFolderName', { name: explorer.ownFolder?.name ?? '' })
      }}<template v-if="own"> · {{ own }}</template>
    </span>
    <span v-else class="ml-auto max-sm:hidden">{{ t('common.viewingOnly') }}</span>
  </footer>
</template>
