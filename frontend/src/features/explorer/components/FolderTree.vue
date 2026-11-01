<script setup lang="ts">
import { SettingsIcon, UsersIcon } from '@lucide/vue'
import { ref, watch } from 'vue'

import PickupMark from '@/components/PickupMark.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/lib/i18n'

import { useExplorer, type ExplorerPage } from '../composables/useExplorer'
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

const pages: { page: ExplorerPage; label: () => string; icon: unknown }[] = [
  { page: 'people', label: () => t('People'), icon: UsersIcon },
  { page: 'settings', label: () => t('Settings'), icon: SettingsIcon },
]
function openPage(page: ExplorerPage) {
  explorer.openPage(page)
  emit('navigated')
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <nav :aria-label="t('Folders')" class="text-sm">
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium hover:bg-muted"
        :class="explorer.folderId === null && !explorer.page && 'bg-selection hover:bg-selection'"
        @click="openRoot"
      >
        <PickupMark class="size-4 shrink-0" />
        <span class="truncate">{{ explorer.pickup.data?.title || t('Untitled pickup') }}</span>
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
        {{ t('No folders yet.') }}
      </p>
    </nav>
    <nav
      v-if="explorer.pickup.data?.is_creator"
      :aria-label="t('Pickup')"
      class="mt-auto space-y-0.5 border-t pt-2 text-sm"
    >
      <button
        v-for="entry in pages"
        :key="entry.page"
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
        :class="explorer.page === entry.page && 'bg-selection font-medium hover:bg-selection'"
        :aria-current="explorer.page === entry.page ? 'page' : undefined"
        @click="openPage(entry.page)"
      >
        <component :is="entry.icon" class="size-4 shrink-0 text-muted-foreground" />
        {{ entry.label() }}
      </button>
    </nav>
  </div>
</template>
