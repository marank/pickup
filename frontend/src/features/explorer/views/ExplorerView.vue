<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { isNotFound } from '@/api/errors'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import NotFoundCard from '@/components/NotFoundCard.vue'
import JoinPanel from '@/features/pickups/components/JoinPanel.vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import CaptionDialog from '../components/CaptionDialog.vue'
import CommandBar from '../components/CommandBar.vue'
import ContentPane from '../components/ContentPane.vue'
import DetailsPane from '../components/DetailsPane.vue'
import FolderTree from '../components/FolderTree.vue'
import MediaViewer from '../components/MediaViewer.vue'
import MobileToolbar from '../components/MobileToolbar.vue'
import NameDialog from '@/components/NameDialog.vue'
import NavBar from '../components/NavBar.vue'
import PagePane from '../components/PagePane.vue'
import PickupBar from '../components/PickupBar.vue'
import ShareDialog from '../components/ShareDialog.vue'
import StatusBar from '../components/StatusBar.vue'
import UploadFab from '../components/UploadFab.vue'
import UploadTray from '../components/UploadTray.vue'
import { provideExplorer, type ExplorerPage } from '../composables/useExplorer'
import { usePhone } from '../composables/usePhone'
import type { ExplorerItem } from '../lib/items'

const props = defineProps<{ pickupId: string; folderId?: string; page?: ExplorerPage }>()

const explorer = provideExplorer(
  () => props.pickupId,
  () => props.folderId ?? null,
  () => props.page ?? null,
)
const { mutations } = explorer
const treeOpen = ref(false)
const phone = usePhone()

/** One v-model per dialog kind, so each dialog keeps its own open/close animation. */
const dialogOpen = (kind: NonNullable<typeof explorer.dialog>['kind']) =>
  computed({
    get: () => explorer.dialog?.kind === kind,
    set: (open: boolean) => {
      if (!open) explorer.closeDialog()
    },
  })
const newFolderOpen = dialogOpen('new-folder')
const renameFolderOpen = dialogOpen('rename-folder')
const captionOpen = dialogOpen('caption')
const deleteOpen = dialogOpen('delete')
const shareOpen = dialogOpen('share')

const dialog = computed(() => explorer.dialog)
// The confirm button closes its dialog before it reports the click, so remember what to delete.
const deleteItems = ref<ExplorerItem[]>([])
watch(dialog, (value) => {
  if (value?.kind === 'delete') deleteItems.value = value.items
})
const deleteDescription = computed(() => {
  const items = deleteItems.value
  const folders = items.filter((item) => item.kind === 'folder').length
  const what = items.length === 1 ? `“${items[0]!.name}”` : `${items.length} items`
  return `${what} will be removed for everyone${folders ? ', including everything inside' : ''}. This cannot be undone.`
})

async function createFolder(name: string) {
  if (dialog.value?.kind !== 'new-folder') return
  const parentId = dialog.value.parentId
  explorer.closeDialog()
  const folder = await explorer.run(
    mutations.createFolder.mutateAsync({ parentId, name }),
    `Folder “${name}” created`,
    'Could not create the folder',
  )
  if (folder) explorer.selection.select(folder.id)
}

async function renameFolder(name: string) {
  if (dialog.value?.kind !== 'rename-folder') return
  const folderId = dialog.value.folder.id
  explorer.closeDialog()
  await explorer.run(
    mutations.renameFolder.mutateAsync({ folderId, name }),
    'Folder renamed',
    'Could not rename',
  )
}

async function saveCaption(caption: string) {
  if (dialog.value?.kind !== 'caption') return
  const media = dialog.value.media
  explorer.closeDialog()
  await explorer.run(
    mutations.updateCaption.mutateAsync({ media, caption }),
    'Caption saved',
    'Could not save the caption',
  )
}

function onFiles(event: Event) {
  const input = event.target as HTMLInputElement
  explorer.addFiles(Array.from(input.files ?? []))
  input.value = ''
}
</script>

<template>
  <div class="px-2 py-3 max-sm:p-0 sm:px-4 sm:py-4">
    <NotFoundCard
      v-if="isNotFound(explorer.pickup.error)"
      title="Pickup not found"
      description="Check the link you got, or ask for a new one."
    />
    <div v-else-if="explorer.pickup.data && !explorer.canView" class="py-6 sm:py-10">
      <JoinPanel :pickup="explorer.pickup.data" />
    </div>
    <!-- On phones: up to the edges, one toolbar, the title in the header (PickupBar). -->
    <div
      v-else
      class="flex h-[calc(100dvh-5.5rem)] min-h-[28rem] flex-col gap-2 max-sm:h-[calc(100dvh-3rem)] max-sm:min-h-0 max-sm:gap-0 sm:h-[calc(100dvh-6.5rem)]"
    >
      <PickupBar />
      <div
        class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm select-none max-sm:rounded-none max-sm:border-0 max-sm:shadow-none"
      >
        <div class="space-y-1 border-b bg-pane px-2 py-2 max-sm:px-1 max-sm:py-1">
          <MobileToolbar v-if="phone" @open-tree="treeOpen = true" />
          <template v-else>
            <NavBar />
            <CommandBar @open-tree="treeOpen = true" />
          </template>
        </div>
        <div class="flex min-h-0 flex-1">
          <aside
            v-if="explorer.prefs.treePane"
            class="w-64 shrink-0 overflow-y-auto border-r bg-pane p-2 max-md:hidden lg:w-72"
          >
            <FolderTree class="min-h-full" />
          </aside>
          <PagePane v-if="page" />
          <template v-else>
            <ContentPane />
            <DetailsPane v-if="explorer.prefs.detailsPane" class="max-lg:hidden" />
          </template>
        </div>
        <StatusBar v-if="!page && !phone" />
      </div>
    </div>

    <Sheet v-model:open="treeOpen">
      <SheetContent side="left" class="w-[85vw] max-w-80 overflow-y-auto bg-pane p-3">
        <SheetHeader class="p-0 pb-2">
          <SheetTitle>Folders</SheetTitle>
          <SheetDescription class="sr-only">Choose a folder to open</SheetDescription>
        </SheetHeader>
        <FolderTree class="flex-1 pb-[env(safe-area-inset-bottom)]" @navigated="treeOpen = false" />
      </SheetContent>
    </Sheet>

    <input
      :ref="(el) => (explorer.fileInput = el as HTMLInputElement | null)"
      type="file"
      multiple
      accept="image/*,video/*"
      class="hidden"
      data-testid="file-input"
      @change="onFiles"
    />

    <UploadTray />
    <UploadFab v-if="phone" />
    <MediaViewer />

    <NameDialog
      v-model:open="newFolderOpen"
      title="New folder"
      label="Name"
      confirm-label="Create"
      @confirm="createFolder"
    />
    <NameDialog
      v-model:open="renameFolderOpen"
      title="Rename folder"
      label="Name"
      :initial="dialog?.kind === 'rename-folder' ? dialog.folder.name : ''"
      confirm-label="Rename"
      @confirm="renameFolder"
    />
    <CaptionDialog
      v-model:open="captionOpen"
      title="Caption"
      :description="dialog?.kind === 'caption' ? dialog.media.original_filename : ''"
      :caption="dialog?.kind === 'caption' ? dialog.media.caption : ''"
      confirm-label="Save"
      @confirm="saveCaption"
    />
    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete?"
      :description="deleteDescription"
      confirm-label="Delete"
      @confirm="explorer.confirmDelete(deleteItems)"
    />
    <ShareDialog
      v-model:open="shareOpen"
      :visibility="explorer.pickup.data?.visibility"
      :join-policy="explorer.pickup.data?.join_policy"
      :member="explorer.pickup.data?.is_member"
      :pickup-id="pickupId"
      :title="explorer.pickup.data?.title || 'Untitled pickup'"
    />
  </div>
</template>
