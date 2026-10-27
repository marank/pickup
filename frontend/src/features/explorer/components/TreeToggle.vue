<script setup lang="ts">
import { FolderTreeIcon } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'

import { Button } from '@/components/ui/button'

import { useExplorer } from '../composables/useExplorer'

const emit = defineEmits<{ openTree: [] }>()
const explorer = useExplorer()
// Tailwind's md breakpoint: from here on the tree is a pane, below it a slide-in panel.
const wide = useMediaQuery('(min-width: 768px)')

function toggleTree() {
  if (wide.value) explorer.prefs.treePane = !explorer.prefs.treePane
  else emit('openTree')
}
</script>

<template>
  <Button
    variant="ghost"
    size="icon-sm"
    :aria-label="
      wide ? (explorer.prefs.treePane ? 'Hide folders' : 'Show folders') : 'Show folders'
    "
    :aria-pressed="wide ? explorer.prefs.treePane : undefined"
    :class="wide && explorer.prefs.treePane && 'bg-muted'"
    title="Folders"
    @click="toggleTree"
  >
    <FolderTreeIcon />
  </Button>
</template>
