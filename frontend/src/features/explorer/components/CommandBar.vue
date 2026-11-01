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
import { t } from '@/lib/i18n'

import { useExplorer } from '../composables/useExplorer'
import TreeToggle from './TreeToggle.vue'
import type { ViewMode } from '../composables/useViewPrefs'
import type { SortKey } from '../lib/items'

const emit = defineEmits<{ openTree: [] }>()
const explorer = useExplorer()

const views: { mode: ViewMode; label: () => string; icon: unknown }[] = [
  { mode: 'details', label: () => t('Details'), icon: ListIcon },
  { mode: 'content', label: () => t('Content'), icon: RowsIcon },
  { mode: 'small', label: () => t('Small icons'), icon: LayoutGridIcon },
  { mode: 'large', label: () => t('Large icons'), icon: SquareIcon },
]
const sorts: { key: SortKey; label: () => string }[] = [
  { key: 'name', label: () => t('Name') },
  { key: 'date', label: () => t('Date added') },
  { key: 'size', label: () => t('Size') },
  { key: 'type', label: () => t('Type') },
  { key: 'owner', label: () => t('Owner') },
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
    :aria-label="t('Commands')"
  >
    <TreeToggle @open-tree="emit('openTree')" />
    <Separator v-if="!explorer.page" orientation="vertical" class="mx-1 !h-5 !self-center" />
    <!-- The creator's pages have no commands, only the tree toggle. -->
    <template v-if="explorer.page" />
    <template v-else-if="explorer.uploadTarget">
      <Button size="sm" :title="t('Upload photos or videos')" @click="explorer.fileInput?.click()">
        <UploadIcon />
        {{ t('Upload') }}
      </Button>
      <Button
        v-if="explorer.canEditHere"
        variant="ghost"
        size="sm"
        :title="t('New folder')"
        :aria-label="t('New folder')"
        @click="explorer.requestNewFolder()"
      >
        <FolderPlusIcon />
        {{ t('New folder') }}
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
        {{ explorer.pickup.data?.is_member ? t('Create your folder') : t('Join to upload') }}
      </RouterLink>
    </Button>

    <template v-if="selected.length && !explorer.page">
      <Separator orientation="vertical" class="mx-1 !h-5 !self-center" />
      <Button
        v-if="single?.editable"
        variant="ghost"
        size="sm"
        :aria-label="single.kind === 'folder' ? t('Rename') : t('Edit caption')"
        @click="explorer.requestRename(single)"
      >
        <PencilIcon />
        <span class="max-md:hidden">{{
          single.kind === 'folder' ? t('Rename') : t('Caption')
        }}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        :aria-label="t('Download')"
        @click="explorer.download(selected)"
      >
        <DownloadIcon />
        <span class="max-md:hidden">{{ t('Download') }}</span>
      </Button>
      <Button
        v-if="explorer.canDelete(selected)"
        variant="ghost"
        size="sm"
        class="text-destructive hover:text-destructive"
        :aria-label="t('Delete')"
        @click="explorer.requestDelete(selected)"
      >
        <Trash2Icon />
        <span class="max-md:hidden">{{ t('Delete') }}</span>
      </Button>
    </template>

    <div v-if="!explorer.page" class="ml-auto flex items-center gap-1">
      <Button
        v-if="!selected.length && explorer.items.length"
        variant="ghost"
        size="sm"
        :aria-label="explorer.folderId ? t('Download folder') : t('Download all')"
        :title="
          explorer.folderId ? t('Download this folder as ZIP') : t('Download everything as ZIP')
        "
        @click="explorer.downloadAll()"
      >
        <DownloadIcon />
        <span class="max-md:hidden">{{
          explorer.folderId ? t('Download folder') : t('Download all')
        }}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" :aria-label="t('Sort')">
            <ArrowDownWideNarrowIcon />
            <span class="max-md:hidden">{{ t('Sort') }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-48 whitespace-nowrap">
          <DropdownMenuLabel>{{ t('Sort by') }}</DropdownMenuLabel>
          <DropdownMenuRadioGroup v-model="explorer.prefs.sortKey">
            <DropdownMenuRadioItem v-for="sort in sorts" :key="sort.key" :value="sort.key">
              {{ sort.label() }}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup v-model="explorer.prefs.sortDirection">
            <DropdownMenuRadioItem value="asc">{{ t('Ascending') }}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">{{ t('Descending') }}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" :aria-label="t('View')">
            <component :is="currentView.icon" />
            <span class="max-md:hidden">{{ currentView.label() }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-48 whitespace-nowrap">
          <DropdownMenuLabel>{{ t('View') }}</DropdownMenuLabel>
          <DropdownMenuRadioGroup v-model="explorer.prefs.view">
            <DropdownMenuRadioItem v-for="view in views" :key="view.mode" :value="view.mode">
              <component :is="view.icon" />
              {{ view.label() }}
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
        :aria-label="t('Details pane')"
        :title="t('Details pane')"
        @click="explorer.prefs.detailsPane = !explorer.prefs.detailsPane"
      >
        <PanelRightIcon />
      </Button>
    </div>
  </div>
</template>
