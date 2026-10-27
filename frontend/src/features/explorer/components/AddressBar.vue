<script setup lang="ts">
import { ChevronRightIcon, PackageOpenIcon, PencilIcon } from '@lucide/vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useExplorer } from '../composables/useExplorer'
import { childrenOf } from '../lib/tree'

const explorer = useExplorer()
const editing = ref(false)
const text = ref('')
const input = ref<HTMLInputElement | null>(null)
const crumbs = ref<HTMLElement | null>(null)

const title = computed(() => explorer.pickup.data?.title || 'Untitled pickup')
/** Segments: the pickup root, then each folder down to the current one. */
const segments = computed(() => [
  { id: null as string | null, name: title.value },
  ...explorer.path.map((folder) => ({ id: folder.id as string | null, name: folder.name })),
])
const pathText = computed(() => segments.value.map((segment) => segment.name).join(' / '))

async function edit() {
  text.value = pathText.value
  editing.value = true
  await nextTick()
  input.value?.select()
}

function submit() {
  if (explorer.navigateToPath(text.value.replace(/\s*\/\s*/g, '/'))) editing.value = false
  else toast.error(`“${text.value}” doesn't exist`)
}

// Always show the deepest part of long paths: on first display, on navigation, on resize.
const showEnd = () => {
  if (crumbs.value) crumbs.value.scrollLeft = crumbs.value.scrollWidth
}
watch([segments, editing], showEnd, { immediate: true, flush: 'post' })
useResizeObserver(crumbs, showEnd)

// Ctrl+L / Alt+D jump into the address bar, as in browsers and Windows Explorer.
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  const key = event.key.toLowerCase()
  if ((event.ctrlKey && key === 'l') || (event.altKey && key === 'd')) {
    event.preventDefault()
    void edit()
  }
})
</script>

<template>
  <div
    class="flex h-9 min-w-0 flex-1 items-center rounded-lg border bg-card shadow-xs focus-within:ring-2 focus-within:ring-ring/40"
  >
    <form v-if="editing" class="flex h-full flex-1" @submit.prevent="submit">
      <input
        ref="input"
        v-model="text"
        aria-label="Folder path"
        class="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
        spellcheck="false"
        @keydown.esc="editing = false"
        @blur="editing = false"
      />
    </form>
    <template v-else>
      <div
        ref="crumbs"
        class="no-scrollbar flex h-full min-w-0 flex-1 items-center overflow-x-auto"
        @click.self="edit"
      >
        <template v-for="(segment, index) in segments" :key="segment.id ?? 'root'">
          <DropdownMenu v-if="index > 0">
            <DropdownMenuTrigger
              class="flex h-7 shrink-0 items-center rounded px-0.5 text-muted-foreground hover:bg-muted"
              :aria-label="`Folders in ${segments[index - 1]!.name}`"
            >
              <ChevronRightIcon class="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="max-h-72 overflow-y-auto">
              <DropdownMenuItem
                v-for="folder in childrenOf(explorer.tree, segments[index - 1]!.id)"
                :key="folder.id"
                :class="folder.id === segment.id && 'font-semibold'"
                @select="explorer.navigate(folder.id)"
              >
                {{ folder.name }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            class="flex h-7 shrink-0 items-center gap-1.5 rounded px-1.5 text-sm whitespace-nowrap hover:bg-muted"
            :class="index === segments.length - 1 ? 'font-semibold' : 'text-muted-foreground'"
            :aria-current="index === segments.length - 1 ? 'location' : undefined"
            @click="explorer.navigate(segment.id)"
          >
            <PackageOpenIcon v-if="index === 0" class="size-4 text-tomato" />
            {{ segment.name }}
          </button>
        </template>
        <span class="min-w-6 flex-1 self-stretch" @click="edit" />
      </div>
      <button
        type="button"
        class="mr-1 flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Type a path"
        title="Type a path (Ctrl+L)"
        @click="edit"
      >
        <PencilIcon class="size-3.5" />
      </button>
    </template>
  </div>
</template>
