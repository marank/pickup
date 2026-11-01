<script setup lang="ts">
import {
  ArrowDownWideNarrowIcon,
  DownloadIcon,
  FolderPlusIcon,
  LayoutGridIcon,
  ListIcon,
  PanelRightIcon,
  PencilIcon,
  RowsIcon,
  SquareIcon,
  Trash2Icon,
  UploadIcon,
  UserPlusIcon,
} from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'

import { useExplorer } from '../composables/useExplorer'
import TreeToggle from './TreeToggle.vue'
import type { ViewMode } from '../composables/useViewPrefs'
import type { SortKey } from '../lib/items'

const emit = defineEmits<{ openTree: [] }>()
const explorer = useExplorer()

const views: { mode: ViewMode; label: string; icon: unknown }[] = [
  { mode: 'details', label: 'Details', icon: ListIcon },
  { mode: 'content', label: 'Content', icon: RowsIcon },
  { mode: 'small', label: 'Small icons', icon: LayoutGridIcon },
  { mode: 'large', label: 'Large icons', icon: SquareIcon },
]
const sorts: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'date', label: 'Date added' },
  { key: 'size', label: 'Size' },
  { key: 'type', label: 'Type' },
  { key: 'owner', label: 'Owner' },
]
const currentView = computed(
  () => views.find((view) => view.mode === explorer.prefs.view) ?? views[0]!,
)

/** Signed in without a folder (creator, invited person), or the pickup is open to everyone. */
const canJoin = computed(
  () =>
    !explorer.pickup.data?.is_read_only &&
    (explorer.pickup.data?.is_member || explorer.pickup.data?.join_policy === 'open'),
)
const selected = computed(() => explorer.selectedItems)
const single = computed(() => (selected.value.length === 1 ? selected.value[0]! : null))
</script>

<template>
  <div
    class="flex min-h-10 items-center gap-1 overflow-x-auto no-scrollbar"
    role="toolbar"
    aria-label="Commands"
  >
    <TreeToggle @open-tree="emit('openTree')" />
    <Separator v-if="!explorer.page" orientation="vertical" class="mx-1 !h-5 !self-center" />
    <!-- The creator's pages have no commands, only the tree toggle. -->
    <template v-if="explorer.page" />
    <template v-else-if="explorer.uploadTarget">
      <Button size="sm" title="Upload photos or videos" @click="explorer.fileInput?.click()">
        <UploadIcon />
        Upload
      </Button>
      <Button
        v-if="explorer.canEditHere"
        variant="ghost"
        size="sm"
        title="New folder"
        aria-label="New folder"
        @click="explorer.requestNewFolder()"
      >
        <FolderPlusIcon />
        New folder
      </Button>
    </template>
    <Button
      v-else-if="!explorer.isMember && explorer.folders.isSuccess && canJoin"
      as-child
      size="sm"
      variant="secondary"
    >
      <RouterLink :to="{ name: 'pickup-join', params: { pickupId: explorer.pickupId } }">
        <UserPlusIcon />
        {{ explorer.pickup.data?.is_member ? 'Create your folder' : 'Join to upload' }}
      </RouterLink>
    </Button>

    <template v-if="selected.length && !explorer.page">
      <Separator orientation="vertical" class="mx-1 !h-5 !self-center" />
      <Button
        v-if="single?.editable"
        variant="ghost"
        size="sm"
        :aria-label="single.kind === 'folder' ? 'Rename' : 'Edit caption'"
        @click="explorer.requestRename(single)"
      >
        <PencilIcon />
        <span class="max-md:hidden">{{ single.kind === 'folder' ? 'Rename' : 'Caption' }}</span>
      </Button>
      <Button variant="ghost" size="sm" aria-label="Download" @click="explorer.download(selected)">
        <DownloadIcon />
        <span class="max-md:hidden">Download</span>
      </Button>
      <Button
        v-if="explorer.canDelete(selected)"
        variant="ghost"
        size="sm"
        class="text-destructive hover:text-destructive"
        aria-label="Delete"
        @click="explorer.requestDelete(selected)"
      >
        <Trash2Icon />
        <span class="max-md:hidden">Delete</span>
      </Button>
    </template>

    <div v-if="!explorer.page" class="ml-auto flex items-center gap-1">
      <Button
        v-if="!selected.length && explorer.items.length"
        variant="ghost"
        size="sm"
        :aria-label="explorer.folderId ? 'Download folder' : 'Download all'"
        :title="explorer.folderId ? 'Download this folder as ZIP' : 'Download everything as ZIP'"
        @click="explorer.downloadAll()"
      >
        <DownloadIcon />
        <span class="max-md:hidden">{{
          explorer.folderId ? 'Download folder' : 'Download all'
        }}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" aria-label="Sort">
            <ArrowDownWideNarrowIcon />
            <span class="max-md:hidden">Sort</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-48 whitespace-nowrap">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup v-model="explorer.prefs.sortKey">
            <DropdownMenuRadioItem v-for="sort in sorts" :key="sort.key" :value="sort.key">
              {{ sort.label }}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup v-model="explorer.prefs.sortDirection">
            <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" aria-label="View">
            <component :is="currentView.icon" />
            <span class="max-md:hidden">{{ currentView.label }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-48 whitespace-nowrap">
          <DropdownMenuLabel>View</DropdownMenuLabel>
          <DropdownMenuRadioGroup v-model="explorer.prefs.view">
            <DropdownMenuRadioItem v-for="view in views" :key="view.mode" :value="view.mode">
              <component :is="view.icon" />
              {{ view.label }}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon-sm"
        class="max-lg:hidden"
        :aria-pressed="explorer.prefs.detailsPane"
        :class="explorer.prefs.detailsPane && 'bg-muted'"
        aria-label="Details pane"
        title="Details pane"
        @click="explorer.prefs.detailsPane = !explorer.prefs.detailsPane"
      >
        <PanelRightIcon />
      </Button>
    </div>
  </div>
</template>
