<script setup lang="ts">
import { FolderIcon, FolderOpenIcon } from '@lucide/vue'
import { RouterLink } from 'vue-router'

import type { Folder } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeDate } from '@/lib/format'

defineProps<{ pickupId: string; folders: Folder[]; loading?: boolean }>()
</script>

<template>
  <div v-if="loading" class="space-y-2">
    <Skeleton v-for="n in 3" :key="n" class="h-16 rounded-lg" />
  </div>

  <div
    v-else-if="folders.length === 0"
    class="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
  >
    <FolderOpenIcon class="size-6" />
    No folders yet. Join to create the first one.
  </div>

  <ul v-else class="space-y-2">
    <li v-for="folder in folders" :key="folder.id">
      <RouterLink
        :to="{ name: 'folder', params: { pickupId, folderId: folder.id } }"
        class="flex items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-muted"
        :class="{ 'border-primary': folder.can_edit }"
      >
        <FolderIcon class="size-5 shrink-0 text-muted-foreground" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium">{{ folder.name }}</p>
          <p class="text-xs text-muted-foreground">
            {{ folder.user_name }} · {{ folder.media_count }} files ·
            {{ formatRelativeDate(folder.created_at) }}
          </p>
        </div>
        <Badge v-if="folder.can_edit">Yours</Badge>
      </RouterLink>
    </li>
  </ul>
</template>
