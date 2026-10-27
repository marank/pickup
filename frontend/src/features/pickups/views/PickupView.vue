<script setup lang="ts">
import { CrownIcon, FolderIcon, UserPlusIcon } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { isNotFound } from '@/api/errors'
import CopyField from '@/components/CopyField.vue'
import NotFoundCard from '@/components/NotFoundCard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import MediaGrid from '@/features/media/components/MediaGrid.vue'

import FolderList from '../components/FolderList.vue'
import { usePickup, usePickupFolders, usePickupMedia } from '../composables/usePickup'

const props = defineProps<{ pickupId: string }>()

const pickup = usePickup(() => props.pickupId)
const folders = usePickupFolders(() => props.pickupId)
const media = usePickupMedia(() => props.pickupId)

const ownFolder = computed(() => folders.data.value?.find((folder) => folder.can_edit))
const shareUrl = computed(() => `${window.location.origin}/pickup/${props.pickupId}`)
</script>

<template>
  <NotFoundCard
    v-if="isNotFound(pickup.error.value)"
    title="Pickup not found"
    description="Check the link you got, or ask for a new one."
  />

  <div v-else class="space-y-8">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="space-y-1">
        <Skeleton v-if="pickup.isPending.value" class="h-9 w-64" />
        <h1 v-else class="text-3xl font-bold tracking-tight">
          {{ pickup.data.value?.title || 'Untitled pickup' }}
        </h1>
        <p class="flex items-center gap-2 text-muted-foreground">
          {{ pickup.data.value?.folder_count ?? 0 }} folders ·
          {{ pickup.data.value?.media_count ?? 0 }} files
          <Badge v-if="pickup.data.value?.is_creator" variant="secondary">
            <CrownIcon />
            Creator
          </Badge>
        </p>
      </div>
      <Button v-if="ownFolder" as-child>
        <RouterLink :to="{ name: 'folder', params: { pickupId, folderId: ownFolder.id } }">
          <FolderIcon />
          Your folder
        </RouterLink>
      </Button>
      <Button v-else-if="!folders.isPending.value" as-child>
        <RouterLink :to="{ name: 'pickup-join', params: { pickupId } }">
          <UserPlusIcon />
          Join and upload
        </RouterLink>
      </Button>
    </header>

    <div class="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside class="space-y-6">
        <section class="space-y-2">
          <h2 class="text-sm font-medium">Invite others</h2>
          <CopyField :value="shareUrl" label="Share link" />
        </section>
        <section class="space-y-2">
          <h2 class="text-sm font-medium">Folders</h2>
          <FolderList
            :pickup-id="pickupId"
            :folders="folders.data.value ?? []"
            :loading="folders.isPending.value"
          />
        </section>
      </aside>

      <section class="space-y-4">
        <h2 class="text-xl font-semibold">All media</h2>
        <MediaGrid
          :media="media.data.value ?? []"
          :loading="media.isPending.value"
          empty-message="Nothing has been uploaded yet."
        />
      </section>
    </div>
  </div>
</template>
