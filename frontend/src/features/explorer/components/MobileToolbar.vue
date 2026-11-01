<script setup lang="ts">
import {
  ArrowDownWideNarrowIcon,
  ArrowUpIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  FolderPlusIcon,
  HourglassIcon,
  LayoutGridIcon,
  ListIcon,
  LockIcon,
  PencilIcon,
  RefreshCwIcon,
  RowsIcon,
  SearchIcon,
  SquareIcon,
  Trash2Icon,
  UserPlusIcon,
  XIcon,
} from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { pickupKeys } from '@/features/pickups/queryKeys'
import { formatFileSize } from '@/lib/format'
import { plural, t } from '@/lib/i18n'

import { useExplorer } from '../composables/useExplorer'
import type { ViewMode } from '../composables/useViewPrefs'
import { pickupDates } from '../lib/dates'
import type { SortKey } from '../lib/items'
import AddressBar from './AddressBar.vue'
import TimelineToggle from './TimelineToggle.vue'
import TreeToggle from './TreeToggle.vue'

/**
 * The explorer's one toolbar on phones (instead of NavBar and CommandBar): folders, up, the
 * path, search and a menu with everything else, including what the status bar shows.
 */
const emit = defineEmits<{ openTree: [] }>()
const explorer = useExplorer()
const router = useRouter()
const client = useQueryClient()
const searchOpen = ref(false)

// The same icons as in CommandBar's view menu.
const views: { mode: ViewMode; label: () => string; icon: unknown }[] = [
  { mode: 'details', label: () => t('common.details'), icon: ListIcon },
  { mode: 'content', label: () => t('common.content'), icon: RowsIcon },
  { mode: 'small', label: () => t('common.smallIcons'), icon: LayoutGridIcon },
  { mode: 'large', label: () => t('common.largeIcons'), icon: SquareIcon },
]
const currentView = computed(
  () => views.find((view) => view.mode === explorer.prefs.view) ?? views[0]!,
)
const sorts: { key: SortKey; label: () => string }[] = [
  { key: 'name', label: () => t('common.name') },
  { key: 'date', label: () => t('common.dateAdded') },
  { key: 'size', label: () => t('common.size') },
  { key: 'type', label: () => t('common.type') },
  { key: 'owner', label: () => t('common.owner') },
]

const selected = computed(() => explorer.selectedItems)
const single = computed(() => (selected.value.length === 1 ? selected.value[0]! : null))
const canJoin = computed(
  () =>
    !explorer.isMember &&
    !explorer.pickup.data?.is_read_only &&
    explorer.folders.isSuccess &&
    (explorer.pickup.data?.is_member || explorer.pickup.data?.join_policy === 'open'),
)
const count = computed(() => plural(explorer.items.length, 'common.nItems'))
const own = computed(() => {
  const storage = explorer.pickup.data?.storage
  if (!explorer.isMember || !storage || storage.own_used === null) return ''
  const used = formatFileSize(storage.own_used)
  return storage.own_limit === null
    ? used
    : t('common.usedOfLimit', { used, limit: formatFileSize(storage.own_limit) })
})
const dates = computed(() => pickupDates(explorer.pickup.data))

const refresh = () => client.invalidateQueries({ queryKey: pickupKeys.all(explorer.pickupId) })
const join = () => router.push({ name: 'pickup-join', params: { pickupId: explorer.pickupId } })
function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) explorer.search = ''
}
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-center gap-0.5" role="toolbar" :aria-label="t('common.commands')">
      <TreeToggle @open-tree="emit('openTree')" />
      <Button
        variant="ghost"
        size="icon-sm"
        :aria-label="t('common.upOneLevel')"
        :disabled="explorer.folderId === null && !explorer.page"
        @click="explorer.goUp()"
      >
        <ArrowUpIcon />
      </Button>
      <AddressBar class="min-w-0 flex-1" />
      <TimelineToggle compact />
      <template v-if="!explorer.page">
        <Button
          variant="ghost"
          size="icon-sm"
          :aria-label="searchOpen ? t('common.closeSearch') : t('common.search')"
          @click="toggleSearch"
        >
          <XIcon v-if="searchOpen" />
          <SearchIcon v-else />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon-sm" :aria-label="t('explorer.mobileToolbar.more')">
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="min-w-56">
            <template v-if="selected.length">
              <DropdownMenuLabel class="text-xs text-muted-foreground">
                {{ t('common.nSelected', { n: selected.length }) }}
              </DropdownMenuLabel>
              <DropdownMenuItem v-if="single?.editable" @select="explorer.requestRename(single)">
                <PencilIcon />
                {{ single.kind === 'folder' ? t('common.rename') : t('common.editCaption') }}
              </DropdownMenuItem>
              <DropdownMenuItem @select="explorer.download(selected)">
                <DownloadIcon />
                {{ t('explorer.mobileToolbar.downloadSelected') }}
              </DropdownMenuItem>
              <DropdownMenuItem
                v-if="explorer.canDelete(selected)"
                variant="destructive"
                @select="explorer.requestDelete(selected)"
              >
                <Trash2Icon />
                {{ t('explorer.mobileToolbar.deleteSelected') }}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </template>
            <DropdownMenuItem v-if="explorer.canEditHere" @select="explorer.requestNewFolder()">
              <FolderPlusIcon />
              {{ t('common.newFolder') }}
            </DropdownMenuItem>
            <DropdownMenuItem v-if="canJoin" @select="join">
              <UserPlusIcon />
              {{
                explorer.pickup.data?.is_member
                  ? t('common.createYourFolder')
                  : t('common.joinToUpload')
              }}
            </DropdownMenuItem>
            <DropdownMenuItem v-if="explorer.items.length" @select="explorer.downloadAll()">
              <DownloadIcon />
              {{ explorer.folderId ? t('common.downloadFolder') : t('common.downloadAll') }}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowDownWideNarrowIcon />
                {{ t('common.sortBy') }}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent class="min-w-44">
                <DropdownMenuRadioGroup v-model="explorer.prefs.sortKey">
                  <DropdownMenuRadioItem v-for="sort in sorts" :key="sort.key" :value="sort.key">
                    {{ sort.label() }}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup v-model="explorer.prefs.sortDirection">
                  <DropdownMenuRadioItem value="asc">{{
                    t('common.ascending')
                  }}</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="desc">{{
                    t('common.descending')
                  }}</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <component :is="currentView.icon" />
                {{ t('common.view') }}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent class="min-w-44">
                <DropdownMenuRadioGroup v-model="explorer.prefs.view">
                  <DropdownMenuRadioItem v-for="view in views" :key="view.mode" :value="view.mode">
                    <component :is="view.icon" />
                    {{ view.label() }}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem @select="refresh">
              <RefreshCwIcon />
              {{ t('common.refresh') }}
            </DropdownMenuItem>
            <!-- What the status bar shows on larger screens. -->
            <DropdownMenuSeparator />
            <DropdownMenuLabel class="space-y-0.5 text-xs font-normal text-muted-foreground">
              <span class="block">{{ count }}</span>
              <span v-if="explorer.isMember" class="block truncate">
                {{ t('common.yourFolderName', { name: explorer.ownFolder?.name ?? '' })
                }}<template v-if="own"> · {{ own }}</template>
              </span>
              <span v-else class="block">{{ t('common.viewingOnly') }}</span>
              <span v-if="dates.readOnly" class="flex items-center gap-1">
                <LockIcon class="size-3" />
                {{ dates.readOnly }}
              </span>
              <span v-if="dates.deleted" class="flex items-center gap-1">
                <HourglassIcon class="size-3" />
                {{ dates.deleted }}
              </span>
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
    </div>
    <label v-if="searchOpen && !explorer.page" class="relative flex h-9 items-center">
      <SearchIcon class="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
      <input
        v-model="explorer.search"
        type="search"
        :placeholder="t('common.searchThisFolder')"
        :aria-label="t('common.searchThisFolder')"
        class="h-full w-full rounded-lg border bg-card pr-2 pl-8 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  </div>
</template>
