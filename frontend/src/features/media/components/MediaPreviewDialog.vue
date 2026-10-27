<script setup lang="ts">
import type { Media } from '@/api/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

defineProps<{ media: Media | null }>()
const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent v-if="media" class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle class="truncate">{{ media.original_filename }}</DialogTitle>
        <DialogDescription>
          {{ media.file_size_display }} · {{ new Date(media.uploaded_at).toLocaleString() }}
        </DialogDescription>
      </DialogHeader>
      <img
        v-if="media.is_image"
        :src="media.file"
        :alt="media.caption || media.original_filename"
        class="max-h-[70vh] w-full rounded-md object-contain"
      />
      <video v-else :src="media.file" controls autoplay class="max-h-[70vh] w-full rounded-md" />
      <p v-if="media.caption" class="text-sm">{{ media.caption }}</p>
    </DialogContent>
  </Dialog>
</template>
