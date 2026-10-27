<script setup lang="ts">
import { ArrowLeftIcon, Trash2Icon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'

import { apiErrorMessage, isNotFound } from '@/api/errors'
import type { Media } from '@/api/types'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import NotFoundCard from '@/components/NotFoundCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import CaptionDialog from '../components/CaptionDialog.vue'
import MediaGrid from '../components/MediaGrid.vue'
import UploadArea from '../components/UploadArea.vue'
import { useFolder, useFolderMedia, useFolderMutations } from '../composables/useFolder'

const props = defineProps<{ pickupId: string; folderId: string }>()

const folder = useFolder(
  () => props.pickupId,
  () => props.folderId,
)
const media = useFolderMedia(
  () => props.pickupId,
  () => props.folderId,
)
const { updateCaption, deleteMedia, clearFolder } = useFolderMutations(
  () => props.pickupId,
  () => props.folderId,
)

const isOwner = computed(() => folder.data.value?.can_edit ?? false)
const items = computed(() => media.data.value ?? [])

const editing = ref<Media | null>(null)
const editOpen = ref(false)
const deleting = ref<Media | null>(null)
const deleteOpen = ref(false)
const clearOpen = ref(false)

function startEdit(item: Media) {
  editing.value = item
  editOpen.value = true
}

async function saveCaption(caption: string) {
  if (!editing.value) return
  try {
    await updateCaption.mutateAsync({ mediaId: editing.value.id, caption })
    editOpen.value = false
    toast.success('Caption saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not save the caption'))
  }
}

function startDelete(item: Media) {
  deleting.value = item
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  try {
    await deleteMedia.mutateAsync(deleting.value.id)
    toast.success(`${deleting.value.original_filename} deleted`)
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not delete the file'))
  }
}

async function confirmClear() {
  try {
    await clearFolder.mutateAsync()
    toast.success('Folder cleared')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not clear the folder'))
  }
}
</script>

<template>
  <NotFoundCard
    v-if="isNotFound(folder.error.value)"
    title="Folder not found"
    description="This folder doesn't exist (anymore), or the pickup was closed."
  />

  <div v-else class="space-y-8">
    <div class="space-y-3">
      <Button as-child variant="ghost" size="sm">
        <RouterLink :to="{ name: 'pickup', params: { pickupId } }">
          <ArrowLeftIcon />
          Back to the pickup
        </RouterLink>
      </Button>
      <Skeleton v-if="folder.isPending.value" class="h-9 w-64" />
      <div v-else-if="folder.data.value" class="flex flex-wrap items-center gap-3">
        <h1 class="text-3xl font-bold tracking-tight">{{ folder.data.value.name }}</h1>
        <Badge v-if="isOwner">Your folder</Badge>
        <p class="w-full text-muted-foreground">
          by {{ folder.data.value.user_name }} · {{ items.length }} files
        </p>
      </div>
    </div>

    <UploadArea v-if="isOwner" :pickup-id="pickupId" :folder-id="folderId" />

    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">{{ isOwner ? 'Your media' : 'Media' }}</h2>
        <Button
          v-if="isOwner && items.length"
          variant="destructive"
          size="sm"
          @click="clearOpen = true"
        >
          <Trash2Icon />
          Delete all
        </Button>
      </div>
      <MediaGrid
        :media="items"
        :loading="media.isPending.value"
        :editable="isOwner"
        :empty-message="
          isOwner
            ? 'Nothing here yet. Upload your first files above.'
            : 'No media in this folder yet.'
        "
        @edit-caption="startEdit"
        @delete="startDelete"
      />
    </section>

    <CaptionDialog
      v-model:open="editOpen"
      title="Edit caption"
      :caption="editing?.caption ?? ''"
      confirm-label="Save"
      :pending="updateCaption.isPending.value"
      @confirm="saveCaption"
    />
    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete this file?"
      :description="`“${deleting?.original_filename}” will be removed for everyone.`"
      confirm-label="Delete"
      @confirm="confirmDelete"
    />
    <ConfirmDialog
      v-model:open="clearOpen"
      title="Delete all files in this folder?"
      description="All your uploads in this folder will be removed for everyone. This cannot be undone."
      confirm-label="Delete all"
      @confirm="confirmClear"
    />
  </div>
</template>
