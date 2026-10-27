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
import { ref } from 'vue'

import { Button } from '@/components/ui/button'
import { pickupKeys } from '@/features/pickups/queryKeys'

import { useExplorer } from '../composables/useExplorer'
import AddressBar from './AddressBar.vue'

const emit = defineEmits<{ openTree: [] }>()
const explorer = useExplorer()
const client = useQueryClient()
const searchOpen = ref(false)

const refresh = () => client.invalidateQueries({ queryKey: pickupKeys.all(explorer.pickupId) })
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        class="md:hidden"
        aria-label="Show folders"
        @click="emit('openTree')"
      >
        <FolderTreeIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="max-sm:hidden"
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
        class="max-sm:hidden"
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
      <AddressBar />
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
