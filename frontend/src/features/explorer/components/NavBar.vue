<script setup lang="ts">
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { ref } from 'vue'

import { Button } from '@/components/ui/button'
import { pickupKeys } from '@/features/pickups/queryKeys'
import { t } from '@/lib/i18n'

import { useExplorer } from '../composables/useExplorer'
import AddressBar from './AddressBar.vue'

const explorer = useExplorer()
const client = useQueryClient()
const searchOpen = ref(false)

const refresh = () => client.invalidateQueries({ queryKey: pickupKeys.all(explorer.pickupId) })
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
          :aria-label="t('Back')"
          :title="t('Back')"
          :disabled="!explorer.canGoBack"
          @click="explorer.goBack()"
        >
          <ArrowLeftIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          :aria-label="t('Forward')"
          :title="t('Forward')"
          :disabled="!explorer.canGoForward"
          @click="explorer.goForward()"
        >
          <ArrowRightIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          :aria-label="t('Up one level')"
          :title="t('Up one level (Backspace)')"
          :disabled="explorer.folderId === null && !explorer.page"
          @click="explorer.goUp()"
        >
          <ArrowUpIcon />
        </Button>
      </div>
      <div class="flex items-center gap-1 max-md:ml-auto">
        <Button
          variant="ghost"
          size="icon"
          :aria-label="t('Refresh')"
          :title="t('Refresh')"
          @click="refresh"
        >
          <RefreshCwIcon />
        </Button>
        <label
          v-if="!explorer.page"
          class="relative flex h-9 items-center max-md:hidden md:w-48 lg:w-64"
          :aria-label="t('Search this folder')"
        >
          <SearchIcon class="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
          <input
            v-model="explorer.search"
            type="search"
            :placeholder="t('Search this folder')"
            class="h-full w-full rounded-lg border bg-card pr-2 pl-8 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <Button
          v-if="!explorer.page"
          variant="ghost"
          size="icon"
          class="md:hidden"
          :aria-label="searchOpen ? t('Close search') : t('Search')"
          @click="searchOpen = !searchOpen"
        >
          <XIcon v-if="searchOpen" />
          <SearchIcon v-else />
        </Button>
      </div>
    </div>
    <label v-if="searchOpen && !explorer.page" class="relative flex h-9 items-center md:hidden">
      <SearchIcon class="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
      <input
        v-model="explorer.search"
        type="search"
        :placeholder="t('Search this folder')"
        :aria-label="t('Search this folder')"
        class="h-full w-full rounded-lg border bg-card pr-2 pl-8 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  </div>
</template>
