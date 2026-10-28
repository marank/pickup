<script setup lang="ts">
import { ChevronRightIcon, FolderIcon, FolderOpenIcon } from '@lucide/vue'
import { computed } from 'vue'

import type { Folder } from '@/api/types'
import { ownerColor } from '@/lib/ownerColor'

import { useExplorer } from '../composables/useExplorer'
import { childrenOf } from '../lib/tree'
import OwnBadge from './OwnBadge.vue'

const props = defineProps<{ folder: Folder; depth: number; expanded: Set<string> }>()
const emit = defineEmits<{ toggle: [id: string]; navigated: [] }>()
const explorer = useExplorer()

const children = computed(() => childrenOf(explorer.tree, props.folder.id))
const isOpen = computed(() => props.expanded.has(props.folder.id))
const isCurrent = computed(() => explorer.folderId === props.folder.id)
const isOwn = computed(() => explorer.ownFolder?.id === props.folder.id)

function open() {
  explorer.navigate(props.folder.id)
  emit('navigated')
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowRight' && children.value.length && !isOpen.value)
    emit('toggle', props.folder.id)
  if (event.key === 'ArrowLeft' && isOpen.value) emit('toggle', props.folder.id)
}
</script>

<template>
  <li
    role="treeitem"
    :aria-expanded="children.length ? isOpen : undefined"
    :aria-selected="isCurrent"
  >
    <div
      class="group flex items-center rounded-md pr-1 hover:bg-muted"
      :class="isCurrent && 'bg-selection font-medium hover:bg-selection'"
      :style="{ paddingLeft: `${depth * 0.85 + 0.25}rem` }"
    >
      <button
        type="button"
        class="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        :class="!children.length && 'invisible'"
        :aria-label="`${isOpen ? 'Collapse' : 'Expand'} ${folder.name}`"
        tabindex="-1"
        @click="emit('toggle', folder.id)"
      >
        <ChevronRightIcon class="size-3.5 transition-transform" :class="isOpen && 'rotate-90'" />
      </button>
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-sm"
        @click="open"
        @keydown="onKey"
      >
        <component
          :is="isCurrent ? FolderOpenIcon : FolderIcon"
          class="size-4 shrink-0"
          :style="{ color: ownerColor(folder.user_name) }"
          fill="currentColor"
          fill-opacity="0.2"
        />
        <span class="truncate">{{ folder.name }}</span>
        <OwnBadge v-if="isOwn" />
      </button>
    </div>
    <ul v-if="isOpen && children.length" role="group">
      <TreeNode
        v-for="child in children"
        :key="child.id"
        :folder="child"
        :depth="depth + 1"
        :expanded="expanded"
        @toggle="emit('toggle', $event)"
        @navigated="emit('navigated')"
      />
    </ul>
  </li>
</template>
