<script setup lang="ts">
import {
  ArrowUpIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  FolderPlusIcon,
  HourglassIcon,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
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

import { useExplorer } from '../composables/useExplorer'
import type { ViewMode } from '../composables/useViewPrefs'
import type { SortKey } from '../lib/items'
import AddressBar from './AddressBar.vue'
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

const views: { mode: ViewMode; label: string }[] = [
  { mode: 'details', label: 'Details' },
  { mode: 'content', label: 'Content' },
  { mode: 'small', label: 'Small icons' },
  { mode: 'large', label: 'Large icons' },
]
const sorts: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'date', label: 'Date added' },
  { key: 'size', label: 'Size' },
  { key: 'type', label: 'Type' },
  { key: 'owner', label: 'Owner' },
]

const selected = computed(() => explorer.selectedItems)
const single = computed(() => (selected.value.length === 1 ? selected.value[0]! : null))
const canJoin = computed(
  () =>
    !explorer.isMember &&
    explorer.folders.isSuccess &&
    (explorer.pickup.data?.is_member || explorer.pickup.data?.join_policy === 'open'),
)
const count = computed(() => {
  const n = explorer.items.length
  return `${n} ${n === 1 ? 'item' : 'items'}`
})
const own = computed(() => {
  const storage = explorer.pickup.data?.storage
  if (!explorer.isMember || !storage || storage.own_used === null) return ''
  const used = formatFileSize(storage.own_used)
  return storage.own_limit === null ? used : `${used} of ${formatFileSize(storage.own_limit)}`
})
const expires = computed(() => {
  const at = explorer.pickup.data?.expires_at
  return at ? new Date(at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''
})

const refresh = () => client.invalidateQueries({ queryKey: pickupKeys.all(explorer.pickupId) })
const join = () => router.push({ name: 'pickup-join', params: { pickupId: explorer.pickupId } })
function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) explorer.search = ''
}
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-center gap-0.5" role="toolbar" aria-label="Commands">
      <TreeToggle @open-tree="emit('openTree')" />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Up one level"
        :disabled="explorer.folderId === null && !explorer.page"
        @click="explorer.goUp()"
      >
        <ArrowUpIcon />
      </Button>
      <AddressBar class="min-w-0 flex-1" />
      <template v-if="!explorer.page">
        <Button
          variant="ghost"
          size="icon-sm"
          :aria-label="searchOpen ? 'Close search' : 'Search'"
          @click="toggleSearch"
        >
          <XIcon v-if="searchOpen" />
          <SearchIcon v-else />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon-sm" aria-label="More">
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="min-w-56">
            <template v-if="selected.length">
              <DropdownMenuLabel class="text-xs text-muted-foreground">
                {{ selected.length }} selected
              </DropdownMenuLabel>
              <DropdownMenuItem v-if="single?.editable" @select="explorer.requestRename(single)">
                <PencilIcon />
                {{ single.kind === 'folder' ? 'Rename' : 'Edit caption' }}
              </DropdownMenuItem>
              <DropdownMenuItem @select="explorer.download(selected)">
                <DownloadIcon />
                Download selected
              </DropdownMenuItem>
              <DropdownMenuItem
                v-if="explorer.canDelete(selected)"
                variant="destructive"
                @select="explorer.requestDelete(selected)"
              >
                <Trash2Icon />
                Delete selected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </template>
            <DropdownMenuItem v-if="explorer.canEditHere" @select="explorer.requestNewFolder()">
              <FolderPlusIcon />
              New folder
            </DropdownMenuItem>
            <DropdownMenuItem v-if="canJoin" @select="join">
              <UserPlusIcon />
              {{ explorer.pickup.data?.is_member ? 'Create your folder' : 'Join to upload' }}
            </DropdownMenuItem>
            <DropdownMenuItem v-if="explorer.items.length" @select="explorer.downloadAll()">
              <DownloadIcon />
              {{ explorer.folderId ? 'Download folder' : 'Download all' }}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Sort by</DropdownMenuSubTrigger>
              <DropdownMenuSubContent class="min-w-44">
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
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>View</DropdownMenuSubTrigger>
              <DropdownMenuSubContent class="min-w-44">
                <DropdownMenuRadioGroup v-model="explorer.prefs.view">
                  <DropdownMenuRadioItem v-for="view in views" :key="view.mode" :value="view.mode">
                    {{ view.label }}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem @select="refresh">
              <RefreshCwIcon />
              Refresh
            </DropdownMenuItem>
            <!-- What the status bar shows on larger screens. -->
            <DropdownMenuSeparator />
            <DropdownMenuLabel class="space-y-0.5 text-xs font-normal text-muted-foreground">
              <span class="block">{{ count }}</span>
              <span v-if="explorer.isMember" class="block truncate">
                Your folder: {{ explorer.ownFolder?.name
                }}<template v-if="own"> · {{ own }}</template>
              </span>
              <span v-else class="block">Viewing only</span>
              <span v-if="expires" class="flex items-center gap-1">
                <HourglassIcon class="size-3" />
                Deleted after {{ expires }}
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
        placeholder="Search this folder"
        aria-label="Search this folder"
        class="h-full w-full rounded-lg border bg-card pr-2 pl-8 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  </div>
</template>
