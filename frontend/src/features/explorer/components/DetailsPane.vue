<script setup lang="ts">
import { DownloadIcon, PencilIcon } from '@lucide/vue'
import { computed } from 'vue'

import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/lib/format'
import { locale, plural, t } from '@/lib/i18n'
import { ownerColor } from '@/lib/ownerColor'

import { useExplorer } from '../composables/useExplorer'
import { folderItem, typeLabel } from '../lib/items'
import { childrenOf } from '../lib/tree'
import ItemThumb from './ItemThumb.vue'

const explorer = useExplorer()
const selected = computed(() => explorer.selectedItems)
const single = computed(() => (selected.value.length === 1 ? selected.value[0]! : null))
const currentItem = computed(() => (explorer.current ? folderItem(explorer.current) : null))
const shown = computed(() => single.value ?? currentItem.value)
const totalSize = computed(() => selected.value.reduce((sum, item) => sum + (item.size ?? 0), 0))
const fullDate = (iso: string) => new Date(iso).toLocaleString(locale.value)
/** One top-level folder per member. */
const people = computed(() => childrenOf(explorer.tree, null).length)
</script>

<template>
  <aside
    class="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l bg-pane p-4"
    :aria-label="t('common.details')"
  >
    <template v-if="selected.length > 1">
      <p class="font-heading text-lg font-semibold">
        {{ t('explorer.detailsPane.nItemsSelected', { n: selected.length }) }}
      </p>
      <p v-if="totalSize" class="text-sm text-muted-foreground">
        {{ t('explorer.detailsPane.sizeInFiles', { size: formatFileSize(totalSize) }) }}
      </p>
    </template>

    <template v-else-if="shown">
      <div
        class="overflow-hidden rounded-lg border bg-card"
        :class="shown.kind === 'folder' ? 'aspect-[4/3]' : 'aspect-square'"
      >
        <ItemThumb :item="shown" size="large" />
      </div>
      <div class="space-y-1">
        <h2 class="text-lg leading-tight font-semibold break-words">{{ shown.name }}</h2>
        <p class="text-sm text-muted-foreground">{{ typeLabel(shown) }}</p>
      </div>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt class="text-muted-foreground">{{ t('common.owner') }}</dt>
        <dd class="flex min-w-0 items-center gap-1.5">
          <span
            class="size-2 shrink-0 rounded-full"
            :style="{ background: ownerColor(shown.owner) }"
          />
          <span class="truncate">{{ shown.owner }}</span>
        </dd>
        <dt class="text-muted-foreground">{{ t('common.added') }}</dt>
        <dd>{{ fullDate(shown.date) }}</dd>
        <template v-if="shown.kind === 'file'">
          <dt class="text-muted-foreground">{{ t('common.size') }}</dt>
          <dd>{{ formatFileSize(shown.size) }}</dd>
        </template>
        <template v-else>
          <dt class="text-muted-foreground">{{ t('explorer.detailsPane.contains') }}</dt>
          <dd>
            {{ plural(shown.folder.subfolder_count, 'common.nFolders') }},
            {{ plural(shown.folder.media_count, 'common.nFiles') }}
          </dd>
        </template>
      </dl>
      <div v-if="shown.kind === 'file'" class="space-y-1.5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium">{{ t('common.caption') }}</p>
          <Button
            v-if="shown.editable"
            variant="ghost"
            size="icon-xs"
            :aria-label="t('common.editCaption')"
            @click="explorer.requestRename(shown)"
          >
            <PencilIcon />
          </Button>
        </div>
        <p
          class="text-sm whitespace-pre-line"
          :class="!shown.media.caption && 'text-muted-foreground'"
        >
          {{ shown.media.caption || t('explorer.detailsPane.noCaption') }}
        </p>
        <Button variant="outline" size="sm" class="mt-2 w-full" @click="explorer.download([shown])">
          <DownloadIcon />
          {{ t('common.download') }}
        </Button>
      </div>
    </template>

    <template v-else-if="explorer.pickup.data">
      <h2 class="text-lg font-semibold">
        {{ explorer.pickup.data.title || t('common.untitledPickup') }}
      </h2>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt class="text-muted-foreground">{{ t('common.people') }}</dt>
        <dd>{{ people }}</dd>
        <dt class="text-muted-foreground">{{ t('explorer.detailsPane.files') }}</dt>
        <dd>{{ explorer.pickup.data.media_count }}</dd>
        <dt class="text-muted-foreground">{{ t('explorer.detailsPane.started') }}</dt>
        <dd>{{ fullDate(explorer.pickup.data.created_at) }}</dd>
      </dl>
      <p class="text-sm text-muted-foreground">
        {{ t('explorer.detailsPane.everyoneWhoJoinsGetsA') }}
      </p>
    </template>
  </aside>
</template>
