<script setup lang="ts">
import { FolderOpenIcon, FolderXIcon, SearchXIcon, UploadIcon } from '@lucide/vue'
import { computed, ref } from 'vue'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { useExplorer } from '../composables/useExplorer'
import ItemsDetails from './ItemsDetails.vue'
import ItemsGrid from './ItemsGrid.vue'

const explorer = useExplorer()
const dragDepth = ref(0)
const dropping = computed(() => dragDepth.value > 0 && explorer.uploadTarget !== null)

const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false

function onDragEnter(event: DragEvent) {
  if (hasFiles(event)) dragDepth.value++
}
function onDragLeave(event: DragEvent) {
  if (hasFiles(event)) dragDepth.value = Math.max(0, dragDepth.value - 1)
}
function onDrop(event: DragEvent) {
  dragDepth.value = 0
  explorer.addFiles(Array.from(event.dataTransfer?.files ?? []))
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (target.closest('input, textarea, [role="menu"]')) return
  const selected = explorer.selectedItems
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
    event.preventDefault()
    explorer.selection.selectAll()
  } else if (event.key === 'Enter' && selected.length === 1) {
    explorer.openItem(selected[0]!)
  } else if ((event.key === 'Delete' || event.key === 'Del') && selected.length) {
    explorer.requestDelete(selected)
  } else if (event.key === 'F2' && selected.length === 1) {
    event.preventDefault()
    explorer.requestRename(selected[0]!)
  } else if (event.key === 'Backspace' && explorer.folderId !== null) {
    event.preventDefault()
    explorer.goUp()
  } else if (event.key === 'Escape') {
    explorer.selection.clear()
  }
}

const emptyMessage = computed(() => {
  if (explorer.search) return null
  if (explorer.folderId === null) return 'Nobody has joined yet.'
  return explorer.canEditHere
    ? 'Drop photos and videos here, or use Upload.'
    : `${explorer.current?.user_name ?? 'The owner'} hasn't added anything here yet.`
})
</script>

<template>
  <section
    class="relative min-h-0 flex-1 overflow-y-auto p-2 outline-none sm:p-3"
    tabindex="0"
    aria-label="Contents"
    data-testid="content-pane"
    @keydown="onKeydown"
    @click.self="explorer.selection.clear()"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div v-if="explorer.missingFolder" class="flex flex-col items-center gap-3 py-16 text-center">
      <FolderXIcon class="size-10 text-muted-foreground" />
      <p class="font-medium">This folder doesn't exist anymore.</p>
      <Button variant="outline" size="sm" @click="explorer.navigate(null)"
        >Back to the pickup</Button
      >
    </div>

    <div
      v-else-if="explorer.loading"
      class="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3"
    >
      <Skeleton v-for="n in 8" :key="n" class="aspect-square rounded-lg" />
    </div>

    <template v-else-if="explorer.items.length">
      <ItemsDetails v-if="explorer.prefs.view === 'details'" />
      <ItemsGrid v-else :variant="explorer.prefs.view" />
    </template>

    <div
      v-else
      class="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground"
      @click.self="explorer.selection.clear()"
    >
      <template v-if="explorer.search">
        <SearchXIcon class="size-10" />
        <p>Nothing here matches “{{ explorer.search }}”.</p>
      </template>
      <template v-else>
        <FolderOpenIcon class="size-10" />
        <p>{{ emptyMessage }}</p>
        <Button v-if="explorer.uploadTarget" size="sm" @click="explorer.fileInput?.click()">
          <UploadIcon />
          Upload
        </Button>
      </template>
    </div>

    <div
      v-if="dropping"
      class="pointer-events-none absolute inset-2 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-tomato bg-tomato/8 text-tomato backdrop-blur-[1px]"
    >
      <UploadIcon class="size-10" />
      <p class="font-heading text-lg font-semibold">
        Drop to upload into “{{ explorer.uploadTarget?.name }}”
      </p>
    </div>
  </section>
</template>
