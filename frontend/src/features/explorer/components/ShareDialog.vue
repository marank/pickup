<script setup lang="ts">
import { Share2Icon } from '@lucide/vue'
import { computed } from 'vue'

import CopyField from '@/components/CopyField.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = defineProps<{ pickupId: string; title: string }>()
const open = defineModel<boolean>('open', { required: true })

const url = computed(() => `${window.location.origin}/pickup/${props.pickupId}`)
const canShare = typeof navigator.share === 'function'

async function share() {
  try {
    await navigator.share({
      title: props.title,
      text: `Add your photos to “${props.title}”`,
      url: url.value,
    })
  } catch {
    // Dismissed by the user; the link can still be copied.
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Invite people</DialogTitle>
        <DialogDescription>
          Everyone with this link can see the pickup and join with their own folder.
        </DialogDescription>
      </DialogHeader>
      <CopyField :value="url" label="Share link" />
      <Button v-if="canShare" class="w-full" @click="share">
        <Share2Icon />
        Share via …
      </Button>
    </DialogContent>
  </Dialog>
</template>
