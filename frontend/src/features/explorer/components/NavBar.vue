<script setup lang="ts">
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  FolderTreeIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useMediaQuery } from '@vueuse/core'
import { ref } from 'vue'

import { Button } from '@/components/ui/button'
import { pickupKeys } from '@/features/pickups/queryKeys'

import { useExplorer } from '../composables/useExplorer'
import AddressBar from './AddressBar.vue'

const emit = defineEmits<{ openTree: [] }>()
const explorer = useExplorer()
const client = useQueryClient()
const searchOpen = ref(false)
// Tailwind's md breakpoint: from here on the tree is a pane, below it a slide-in panel.
const wide = useMediaQuery('(min-width: 768px)')

const refresh = () => client.invalidateQueries({ queryKey: pickupKeys.all(explorer.pickupId) })

function toggleTree() {
  if (wide.value) explorer.prefs.treePane = !explorer.prefs.treePane
  else emit('openTree')
}
</script>

<template>
  <div class="space-y-2">
    <!-- On small screens the address bar gets its own full-width row on top. -->
    <div class="flex flex-wrap items-center gap-1 max-md:gap-y-2">
      <AddressBar class="max-md:order-first max-md:basis-full" />
      <div class="flex items-center gap-1 md:order-first">
        <Button
          variant="ghost"
          size="icon"
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
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back"
          title="Back"
          :disabled="!explorer.canGoBack"
          @click="explorer.goBack()"
        >
          <ArrowLeftIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Forward"
          title="Forward"
          :disabled="!explorer.canGoForward"
          @click="explorer.goForward()"
        >
          <ArrowRightIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Up one level"
          title="Up one level (Backspace)"
          :disabled="explorer.folderId === null"
          @click="explorer.goUp()"
        >
          <ArrowUpIcon />
        </Button>
      </div>
      <div class="flex items-center gap-1 max-md:ml-auto">
        <Button variant="ghost" size="icon" aria-label="Refresh" title="Refresh" @click="refresh">
          <RefreshCwIcon />
        </Button>
        <label
          class="relative flex h-9 items-center max-md:hidden md:w-48 lg:w-64"
          aria-label="Search this folder"
        >
          <SearchIcon class="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
          <input
            v-model="explorer.search"
            type="search"
            placeholder="Search this folder"
            class="h-full w-full rounded-lg border bg-card pr-2 pl-8 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <Button
          variant="ghost"
          size="icon"
          class="md:hidden"
          :aria-label="searchOpen ? 'Close search' : 'Search'"
          @click="searchOpen = !searchOpen"
        >
          <XIcon v-if="searchOpen" />
          <SearchIcon v-else />
        </Button>
      </div>
    </div>
    <label v-if="searchOpen" class="relative flex h-9 items-center md:hidden">
      <SearchIcon class="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
      <input
        v-model="explorer.search"
        type="search"
        placeholder="Search this folder"
        aria-label="Search this folder"
        class="h-full w-full rounded-lg border bg-card pr-2 pl-8 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  </div>
</template>
