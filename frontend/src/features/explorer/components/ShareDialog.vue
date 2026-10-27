<script setup lang="ts">
import { DownloadIcon, Share2Icon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

import CopyField from '@/components/CopyField.vue'
import QrCard from '@/components/QrCard.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = defineProps<{
  pickupId: string
  title: string
  visibility?: string
  joinPolicy?: string
}>()
const open = defineModel<boolean>('open', { required: true })

const url = computed(() => `${window.location.origin}/pickup/${props.pickupId}`)
const canShare = typeof navigator.share === 'function'

const qr = ref<InstanceType<typeof QrCard> | null>(null)

async function downloadQr() {
  const blob = await qr.value?.toPng()
  if (!blob) {
    toast.error('Could not create the image')
    return
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${props.title} – QR code.png`
  link.click()
  URL.revokeObjectURL(link.href)
}

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
          <template v-if="visibility === 'creator'">
            The pickup is closed: with this link people only see that it exists. Open it again in
            Settings.
          </template>
          <template v-else-if="joinPolicy === 'invite'">
            Only invited people can take part — invite them under People. With this link others
            {{
              visibility === 'link' ? 'can look at the photos' : 'only see that the pickup exists'
            }}.
          </template>
          <template v-else-if="joinPolicy === 'closed'">
            Nobody new can join right now.
            {{ visibility === 'link' ? 'Everyone with this link can look at the photos.' : '' }}
          </template>
          <template v-else>
            Everyone with this link can join with their own folder{{
              visibility === 'link' ? ' and look at the photos' : ''
            }}.
          </template>
        </DialogDescription>
      </DialogHeader>
      <CopyField :value="url" label="Share link" />
      <div class="flex flex-col items-center gap-3 rounded-xl border bg-pane p-4 text-center">
        <QrCard ref="qr" :value="url" :title="title" class="w-44" />
        <p class="text-sm text-muted-foreground">
          Scan to open the pickup. Save the card as picture for a table card, a poster or a slide at
          the party.
        </p>
        <Button variant="outline" size="sm" @click="downloadQr">
          <DownloadIcon />
          Save QR card
        </Button>
      </div>
      <Button v-if="canShare" class="w-full" @click="share">
        <Share2Icon />
        Share via …
      </Button>
    </DialogContent>
  </Dialog>
</template>
