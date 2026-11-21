<script setup lang="ts">
import {
  FolderOpenIcon,
  FolderXIcon,
  ImagePlusIcon,
  LockIcon,
  SearchXIcon,
  UploadIcon,
} from '@lucide/vue'
import { computed, ref } from 'vue'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/lib/i18n'

import { useExplorer } from '../composables/useExplorer'
import { useMarquee } from '../composables/useMarquee'
import { usePhone } from '../composables/usePhone'
import ItemsDetails from './ItemsDetails.vue'
import ItemsGrid from './ItemsGrid.vue'

const explorer = useExplorer()
const pane = ref<HTMLElement | null>(null)
const marquee = useMarquee(pane, explorer)
const phone = usePhone()
/** Your own folder, still empty: the place to start, so it says how. */
const ownEmpty = computed(
  () => !explorer.search && explorer.uploadTarget !== null && explorer.folderId !== null,
)
const dragDepth = ref(0)
const dropping = computed(() => dragDepth.value > 0 && explorer.uploadTarget !== null)

const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false

function onDragEnter(event: DragEvent) {
  if (hasFiles(event)) dragDepth.value++
}
function onDragLeave(event: DragEvent) {
  if (hasFiles(event)) dragDepth.value = Math.max(0, dragDepth.value - 1)
}
function onDrop(event: DragEvent) {
  dragDepth.value = 0
  explorer.addFiles(Array.from(event.dataTransfer?.files ?? []))
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (target.closest('input, textarea, [role="menu"]')) return
  const selected = explorer.selectedItems
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
    event.preventDefault()
    explorer.selection.selectAll()
  } else if (event.key === 'Enter' && selected.length === 1) {
    explorer.openItem(selected[0]!)
  } else if ((event.key === 'Delete' || event.key === 'Del') && selected.length) {
    explorer.requestDelete(selected)
  } else if (event.key === 'F2' && selected.length === 1) {
    event.preventDefault()
    explorer.requestRename(selected[0]!)
  } else if (event.key === 'Backspace' && explorer.folderId !== null) {
    event.preventDefault()
    explorer.goUp()
  } else if (event.key === 'Escape') {
    explorer.selection.clear()
  }
}

const emptyMessage = computed(() => {
  if (explorer.search) return null
  if (explorer.folderId === null) return t('explorer.contentPane.nobodyHasJoinedYet')
  return explorer.canEditHere
    ? t('explorer.contentPane.dropPhotosAndVideosHere')
    : t('explorer.contentPane.nameHasntAddedAnythingHere', {
        name: explorer.current?.user_name ?? t('explorer.contentPane.theOwner'),
      })
})
</script>

<template>
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- the focusable pane handles the keys for its items; the pointer draws the selection rectangle -->
  <section
    ref="pane"
    class="relative min-h-0 flex-1 overflow-y-auto p-2 outline-none sm:p-3"
    tabindex="0"
    :aria-label="t('explorer.contentPane.contents')"
    data-testid="content-pane"
    @keydown="onKeydown"
    @click.capture="marquee.onClickCapture"
    @click.self="explorer.selection.clear()"
    @pointerdown="marquee.onPointerDown"
    @pointermove="marquee.onPointerMove"
    @pointerup="marquee.onPointerUp"
    @pointercancel="marquee.onPointerUp"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <p
      v-if="phone && explorer.pickup.data?.is_read_only"
      class="mb-2 flex items-center gap-2 rounded-lg bg-butter/40 px-3 py-2 text-xs"
    >
      <LockIcon class="size-3.5 shrink-0" />
      {{ t('explorer.contentPane.readOnlyNowYouCan') }}
    </p>

    <div v-if="explorer.missingFolder" class="flex flex-col items-center gap-3 py-16 text-center">
      <FolderXIcon class="size-10 text-muted-foreground" />
      <p class="font-medium">{{ t('explorer.contentPane.thisFolderDoesntExistAnymore') }}</p>
      <Button variant="outline" size="sm" @click="explorer.navigate(null)">{{
        t('explorer.contentPane.backToThePickup')
      }}</Button>
    </div>

    <div
      v-else-if="explorer.loading"
      class="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3"
    >
      <Skeleton v-for="n in 8" :key="n" class="aspect-square rounded-lg" />
    </div>

    <template v-else-if="explorer.items.length">
      <ItemsDetails v-if="explorer.prefs.view === 'details'" />
      <ItemsGrid v-else :variant="explorer.prefs.view" />
    </template>

    <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- clicking empty space deselects; the keyboard has Escape -->
    <div
      v-else-if="ownEmpty"
      class="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center"
      @click.self="explorer.selection.clear()"
    >
      <ImagePlusIcon class="size-12 text-tomato" />
      <p class="text-lg font-semibold">{{ t('explorer.contentPane.nothingHereYet') }}</p>
      <p class="text-sm text-muted-foreground">
        {{
          phone
            ? t('explorer.contentPane.addYourPhotosAndVideos')
            : t('explorer.contentPane.dropThemHereOrAdd')
        }}
      </p>
      <Button @click="explorer.fileInput?.click()">
        <UploadIcon />
        {{ t('explorer.contentPane.uploadPhotosAndVideos') }}
      </Button>
    </div>

    <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- clicking empty space deselects; the keyboard has Escape -->
    <div
      v-else
      class="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground"
      @click.self="explorer.selection.clear()"
    >
      <template v-if="explorer.search">
        <SearchXIcon class="size-10" />
        <p>{{ t('explorer.contentPane.nothingHereMatchesSearch', { search: explorer.search }) }}</p>
      </template>
      <template v-else>
        <FolderOpenIcon class="size-10" />
        <p>{{ emptyMessage }}</p>
        <Button v-if="explorer.uploadTarget" size="sm" @click="explorer.fileInput?.click()">
          <UploadIcon />
          {{ t('common.upload') }}
        </Button>
      </template>
    </div>

    <div
      v-if="marquee.box.value"
      class="pointer-events-none absolute z-20 rounded-sm border border-tomato/70 bg-tomato/10"
      data-testid="marquee"
      :style="{
        left: `${marquee.box.value.left}px`,
        top: `${marquee.box.value.top}px`,
        width: `${marquee.box.value.width}px`,
        height: `${marquee.box.value.height}px`,
      }"
    />

    <div
      v-if="dropping"
      class="pointer-events-none absolute inset-2 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-tomato bg-tomato/8 text-tomato backdrop-blur-[1px]"
    >
      <UploadIcon class="size-10" />
      <p class="font-heading text-lg font-semibold">
        {{
          t('explorer.contentPane.dropToUploadIntoName', {
            name: explorer.uploadTarget?.name ?? '',
          })
        }}
      </p>
    </div>
  </section>
</template>
