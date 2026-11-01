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
import TimelineToggle from './TimelineToggle.vue'
import TreeToggle from './TreeToggle.vue'
import type { ViewMode } from '../composables/useViewPrefs'
import type { SortKey } from '../lib/items'

const emit = defineEmits<{ openTree: [] }>()
const explorer = useExplorer()

const views: { mode: ViewMode; label: () => string; icon: unknown }[] = [
  { mode: 'details', label: () => t('common.details'), icon: ListIcon },
  { mode: 'content', label: () => t('common.content'), icon: RowsIcon },
  { mode: 'small', label: () => t('common.smallIcons'), icon: LayoutGridIcon },
  { mode: 'large', label: () => t('common.largeIcons'), icon: SquareIcon },
]
const sorts: { key: SortKey; label: () => string }[] = [
  { key: 'name', label: () => t('common.name') },
  { key: 'date', label: () => t('common.dateAdded') },
  { key: 'size', label: () => t('common.size') },
  { key: 'type', label: () => t('common.type') },
  { key: 'owner', label: () => t('common.owner') },
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
    :aria-label="t('common.commands')"
  >
    <TreeToggle @open-tree="emit('openTree')" />
    <TimelineToggle />
    <Separator v-if="!explorer.page" orientation="vertical" class="mx-1 !h-5 !self-center" />
    <!-- Pages (timeline, the creator's) have no commands, only the toggles. -->
    <template v-if="explorer.page" />
    <template v-else-if="explorer.uploadTarget">
      <Button
        size="sm"
        :title="t('common.uploadPhotosOrVideos')"
        @click="explorer.fileInput?.click()"
      >
        <UploadIcon />
        {{ t('common.upload') }}
      </Button>
      <Button
        v-if="explorer.canEditHere"
        variant="ghost"
        size="sm"
        :title="t('common.newFolder')"
        :aria-label="t('common.newFolder')"
        @click="explorer.requestNewFolder()"
      >
        <FolderPlusIcon />
        {{ t('common.newFolder') }}
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
        {{
          explorer.pickup.data?.is_member ? t('common.createYourFolder') : t('common.joinToUpload')
        }}
      </RouterLink>
    </Button>

    <template v-if="selected.length && !explorer.page">
      <Separator orientation="vertical" class="mx-1 !h-5 !self-center" />
      <Button
        v-if="single?.editable"
        variant="ghost"
        size="sm"
        :aria-label="single.kind === 'folder' ? t('common.rename') : t('common.editCaption')"
        @click="explorer.requestRename(single)"
      >
        <PencilIcon />
        <span class="max-md:hidden">{{
          single.kind === 'folder' ? t('common.rename') : t('common.caption')
        }}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        :aria-label="t('common.download')"
        @click="explorer.download(selected)"
      >
        <DownloadIcon />
        <span class="max-md:hidden">{{ t('common.download') }}</span>
      </Button>
      <Button
        v-if="explorer.canDelete(selected)"
        variant="ghost"
        size="sm"
        class="text-destructive hover:text-destructive"
        :aria-label="t('common.delete')"
        @click="explorer.requestDelete(selected)"
      >
        <Trash2Icon />
        <span class="max-md:hidden">{{ t('common.delete') }}</span>
      </Button>
    </template>

    <div v-if="!explorer.page" class="ml-auto flex items-center gap-1">
      <Button
        v-if="!selected.length && explorer.items.length"
        variant="ghost"
        size="sm"
        :aria-label="explorer.folderId ? t('common.downloadFolder') : t('common.downloadAll')"
        :title="
          explorer.folderId
            ? t('explorer.commandBar.downloadThisFolderAsZip')
            : t('explorer.commandBar.downloadEverythingAsZip')
        "
        @click="explorer.downloadAll()"
      >
        <DownloadIcon />
        <span class="max-md:hidden">{{
          explorer.folderId ? t('common.downloadFolder') : t('common.downloadAll')
        }}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" :aria-label="t('explorer.commandBar.sort')">
            <ArrowDownWideNarrowIcon />
            <span class="max-md:hidden">{{ t('explorer.commandBar.sort') }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-48 whitespace-nowrap">
          <DropdownMenuLabel>{{ t('common.sortBy') }}</DropdownMenuLabel>
          <DropdownMenuRadioGroup v-model="explorer.prefs.sortKey">
            <DropdownMenuRadioItem v-for="sort in sorts" :key="sort.key" :value="sort.key">
              {{ sort.label() }}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup v-model="explorer.prefs.sortDirection">
            <DropdownMenuRadioItem value="asc">{{ t('common.ascending') }}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">{{ t('common.descending') }}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" :aria-label="t('common.view')">
            <component :is="currentView.icon" />
            <span class="max-md:hidden">{{ currentView.label() }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-48 whitespace-nowrap">
          <DropdownMenuLabel>{{ t('common.view') }}</DropdownMenuLabel>
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
        :aria-label="t('explorer.commandBar.detailsPane')"
        :title="t('explorer.commandBar.detailsPane')"
        @click="explorer.prefs.detailsPane = !explorer.prefs.detailsPane"
      >
        <PanelRightIcon />
      </Button>
    </div>
  </div>
</template>
