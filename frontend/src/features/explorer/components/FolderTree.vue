<script setup lang="ts">
import { PackageOpenIcon } from '@lucide/vue'
import { ref, watch } from 'vue'

import { Skeleton } from '@/components/ui/skeleton'

import { useExplorer } from '../composables/useExplorer'
import { childrenOf } from '../lib/tree'
import TreeNode from './TreeNode.vue'

const emit = defineEmits<{ navigated: [] }>()
const explorer = useExplorer()
const expanded = ref(new Set<string>())

// Keep the path to the current folder open, like Explorer's "expand to open folder".
watch(
  () => explorer.path.map((folder) => folder.id),
  (ids) => {
    const next = new Set(expanded.value)
    for (const id of ids) next.add(id)
    expanded.value = next
  },
  { immediate: true },
)

function toggle(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function openRoot() {
  explorer.navigate(null)
  emit('navigated')
}
</script>

<template>
  <nav aria-label="Folders" class="text-sm">
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium hover:bg-muted"
      :class="explorer.folderId === null && 'bg-selection hover:bg-selection'"
      @click="openRoot"
    >
      <PackageOpenIcon class="size-4 shrink-0 text-tomato" />
      <span class="truncate">{{ explorer.pickup.data?.title || 'Untitled pickup' }}</span>
    </button>
    <div v-if="explorer.folders.isPending" class="mt-2 space-y-1.5 px-2">
      <Skeleton v-for="n in 4" :key="n" class="h-6" />
    </div>
    <ul v-else role="tree" class="mt-0.5">
      <TreeNode
        v-for="folder in childrenOf(explorer.tree, null)"
        :key="folder.id"
        :folder="folder"
        :depth="1"
        :expanded="expanded"
        @toggle="toggle"
        @navigated="emit('navigated')"
      />
    </ul>
    <p
      v-if="explorer.folders.isSuccess && !childrenOf(explorer.tree, null).length"
      class="px-3 py-2 text-xs text-muted-foreground"
    >
      No folders yet.
    </p>
  </nav>
</template>
