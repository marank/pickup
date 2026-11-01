<script setup lang="ts">
import { DownloadIcon, KeyRoundIcon, Share2Icon, UsersIcon } from '@lucide/vue'
import { computed, ref } from 'vue'

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
import { t } from '@/lib/i18n'

const props = defineProps<{
  pickupId: string
  title: string
  visibility?: string
  joinPolicy?: string
  /** Signed in: they also have a personal link, which must not be mixed up with this one. */
  member?: boolean
}>()
const open = defineModel<boolean>('open', { required: true })

const url = computed(() => `${window.location.origin}/pickup/${props.pickupId}`)
const canShare = typeof navigator.share === 'function'

/** What this link lets people do, after the pickup's visibility and join policy. */
const description = computed(() => {
  const looks = props.visibility === 'link'
  if (props.visibility === 'creator')
    return t(
      'The pickup is closed: with this link people only see that it exists. Open it again in Settings.',
    )
  if (props.joinPolicy === 'invite')
    return looks
      ? t(
          'Only invited people can take part — invite them under People. With this link others can look at the photos.',
        )
      : t(
          'Only invited people can take part — invite them under People. With this link others only see that the pickup exists.',
        )
  if (props.joinPolicy === 'closed')
    return looks
      ? t('Nobody new can join right now. Everyone with this link can look at the photos.')
      : t('Nobody new can join right now.')
  return looks
    ? t('Everyone with this link can join with their own folder and look at the photos.')
    : t('Everyone with this link can join with their own folder.')
})

const qr = ref<InstanceType<typeof QrCard> | null>(null)

async function share() {
  try {
    await navigator.share({
      title: props.title,
      text: t('Add your photos to “{title}”', { title: props.title }),
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
        <DialogTitle>{{ t('Invite people') }}</DialogTitle>
        <DialogDescription>
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-1.5">
        <p class="flex items-center gap-1.5 text-sm font-medium">
          <UsersIcon class="size-4 text-muted-foreground" />
          {{ t('Share link') }}
          <span class="font-normal text-muted-foreground">{{ t('— for everyone') }}</span>
        </p>
        <CopyField :value="url" :label="t('Share link')" />
      </div>
      <div class="flex flex-col items-center gap-3 rounded-xl border bg-pane p-4 text-center">
        <QrCard ref="qr" :value="url" :title="title" class="w-44" />
        <p class="text-sm text-muted-foreground">
          {{ t('Scan to open the pickup. Save the card as an image to print or share it.') }}
        </p>
        <Button variant="outline" size="sm" @click="qr?.save()">
          <DownloadIcon />
          {{ t('Save QR card') }}
        </Button>
      </div>
      <Button v-if="canShare" class="w-full" @click="share">
        <Share2Icon />
        {{ t('Share via …') }}
      </Button>
      <p v-if="member" class="flex gap-1.5 text-xs text-muted-foreground">
        <KeyRoundIcon class="mt-px size-3.5 shrink-0" />
        {{ t("Don't send your personal link instead: it is only for you and logs in as you.") }}
      </p>
    </DialogContent>
  </Dialog>
</template>
