<script setup lang="ts">
import { EllipsisVerticalIcon } from '@lucide/vue'
import { computed } from 'vue'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useExplorer } from '../composables/useExplorer'
import { itemActions } from '../lib/actions'
import type { ExplorerItem } from '../lib/items'

const props = defineProps<{ item: ExplorerItem }>()
const explorer = useExplorer()
const actions = computed(() => itemActions(explorer, props.item))
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon-xs"
        :aria-label="`Actions for ${item.name}`"
        class="text-muted-foreground"
        @click.stop
        @dblclick.stop
      >
        <EllipsisVerticalIcon />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-44">
      <DropdownMenuItem
        v-for="action in actions"
        :key="action.id"
        :variant="action.destructive ? 'destructive' : 'default'"
        @select="action.run"
      >
        <component :is="action.icon" />
        {{ action.label }}
        <DropdownMenuShortcut v-if="action.shortcut" class="max-md:hidden">
          {{ action.shortcut }}
        </DropdownMenuShortcut>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
