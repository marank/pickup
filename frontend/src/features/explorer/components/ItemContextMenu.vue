<script setup lang="ts">
import { computed } from 'vue'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

import { useExplorer } from '../composables/useExplorer'
import { itemActions } from '../lib/actions'
import type { ExplorerItem } from '../lib/items'

const props = defineProps<{ item: ExplorerItem }>()
const explorer = useExplorer()
const actions = computed(() => itemActions(explorer, props.item))

/** Right-click on an unselected item selects it first, like every file manager. */
function onOpen(open: boolean) {
  if (open && !explorer.selection.isSelected(props.item.id))
    explorer.selection.select(props.item.id)
}
</script>

<template>
  <ContextMenu @update:open="onOpen">
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>
    <ContextMenuContent class="min-w-48">
      <ContextMenuItem
        v-for="action in actions"
        :key="action.id"
        :variant="action.destructive ? 'destructive' : 'default'"
        @select="action.run"
      >
        <component :is="action.icon" />
        {{ action.label }}
        <ContextMenuShortcut v-if="action.shortcut">{{ action.shortcut }}</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>
