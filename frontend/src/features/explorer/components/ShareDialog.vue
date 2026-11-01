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
  if (props.visibility === 'creator') return t('explorer.shareDialog.thePickupIsClosedWith')
  if (props.joinPolicy === 'invite')
    return looks
      ? t('explorer.shareDialog.onlyInvitedPeopleCanTake2')
      : t('explorer.shareDialog.onlyInvitedPeopleCanTake')
  if (props.joinPolicy === 'closed')
    return looks
      ? t('explorer.shareDialog.nobodyNewCanJoinRight')
      : t('common.nobodyNewCanJoinRight')
  return looks
    ? t('explorer.shareDialog.everyoneWithThisLinkCan2')
    : t('explorer.shareDialog.everyoneWithThisLinkCan')
})

const qr = ref<InstanceType<typeof QrCard> | null>(null)

async function share() {
  try {
    await navigator.share({
      title: props.title,
      text: t('explorer.shareDialog.addYourPhotosToTitle', { title: props.title }),
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
        <DialogTitle>{{ t('explorer.shareDialog.invitePeople') }}</DialogTitle>
        <DialogDescription>
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-1.5">
        <p class="flex items-center gap-1.5 text-sm font-medium">
          <UsersIcon class="size-4 text-muted-foreground" />
          {{ t('common.shareLink') }}
          <span class="font-normal text-muted-foreground">{{
            t('explorer.shareDialog.forEveryone')
          }}</span>
        </p>
        <CopyField :value="url" :label="t('common.shareLink')" />
      </div>
      <div class="flex flex-col items-center gap-3 rounded-xl border bg-pane p-4 text-center">
        <QrCard ref="qr" :value="url" :title="title" class="w-44" />
        <p class="text-sm text-muted-foreground">
          {{ t('explorer.shareDialog.scanToOpenThePickup') }}
        </p>
        <Button variant="outline" size="sm" @click="qr?.save()">
          <DownloadIcon />
          {{ t('common.saveQrCard') }}
        </Button>
      </div>
      <Button v-if="canShare" class="w-full" @click="share">
        <Share2Icon />
        {{ t('explorer.shareDialog.shareVia') }}
      </Button>
      <p v-if="member" class="flex gap-1.5 text-xs text-muted-foreground">
        <KeyRoundIcon class="mt-px size-3.5 shrink-0" />
        {{ t('explorer.shareDialog.dontSendYourPersonalLink') }}
      </p>
    </DialogContent>
  </Dialog>
</template>
