<script setup lang="ts">
import {
  CalendarClockIcon,
  FolderOpenIcon,
  KeyRoundIcon,
  MailCheckIcon,
  MailIcon,
  UploadIcon,
  type LucideIcon,
} from '@lucide/vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, nextTick, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import type { Pickup } from '@/api/types'
import CopyField from '@/components/CopyField.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, t } from '@/lib/i18n'

import { personalLinkQuery, useMarkIntroSeen } from '../composables/usePickup'
import { useSetEmail } from '../composables/usePickupAdmin'
import { pickupKeys } from '../queryKeys'

/**
 * What newcomers should know, one topic per page: their folder, their personal link,
 * uploading and downloading, and the pickup's dates if it has any (read-only, deletion). Opens by itself once
 * after joining (`intro_seen`), and again from the account menu.
 */
const props = defineProps<{ pickup: Pickup }>()
const open = defineModel<boolean>('open', { required: true })

type Page = 'folder' | 'link' | 'files' | 'dates'
const ICONS: Record<Page, LucideIcon> = {
  folder: FolderOpenIcon,
  link: KeyRoundIcon,
  files: UploadIcon,
  dates: CalendarClockIcon,
}

const pages = computed<Page[]>(() =>
  props.pickup.read_only_at || props.pickup.expires_at
    ? ['folder', 'link', 'files', 'dates']
    : ['folder', 'link', 'files'],
)
const index = ref(0)
const page = computed(() => pages.value[index.value] ?? 'folder')
const last = computed(() => index.value === pages.value.length - 1)

const creator = computed(() => props.pickup.creator_name || t('common.theCreator'))
const longDate = (iso: string | null) => (iso ? formatDate(iso, { dateStyle: 'long' }) : '')
const readOnly = computed(() => longDate(props.pickup.read_only_at))
const deleted = computed(() => longDate(props.pickup.expires_at))
// "Share" is set in bold inside the sentence.
const shareHint = computed(() => t('pickups.introDialog.toInviteOthersUseShare').split('{share}'))

// Whether an address is stored decides what the link page offers.
const client = useQueryClient()
const link = useQuery({
  ...personalLinkQuery(props.pickup.id),
  enabled: computed(() => open.value && props.pickup.is_member),
})
const hasEmail = computed(() => link.data.value?.has_email ?? false)
const personalUrl = computed(() =>
  link.data.value ? `${window.location.origin}${link.data.value.member_url}` : '',
)
const setEmail = useSetEmail(() => props.pickup.id)
const email = ref('')
const emailing = ref(false)
const emailInput = ref<InstanceType<typeof Input> | null>(null)

async function startEmailing() {
  emailing.value = true
  await nextTick()
  ;(emailInput.value?.$el as HTMLInputElement | undefined)?.focus()
}

const markSeen = useMarkIntroSeen(() => props.pickup.id)
watch(open, (isOpen) => {
  if (isOpen) {
    index.value = 0
    email.value = ''
    emailing.value = false
  } else if (!props.pickup.intro_seen) {
    markSeen.mutate()
  }
})

async function sendLink() {
  try {
    const { message } = await setEmail.mutateAsync(email.value.trim())
    toast.success(message || t('common.checkYourInboxForYour'))
    await client.invalidateQueries({ queryKey: pickupKeys.link(props.pickup.id) })
  } catch (err) {
    toast.error(apiErrorMessage(err, t('common.couldNotSendTheMail')))
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <component :is="ICONS[page]" class="mb-1 size-8 text-tomato" aria-hidden="true" />
        <template v-if="page === 'folder'">
          <DialogTitle>{{ t('pickups.introDialog.thisIsYourFolder') }}</DialogTitle>
          <DialogDescription>{{
            t('pickups.introDialog.everythingYouAddGoesInto')
          }}</DialogDescription>
        </template>
        <template v-else-if="page === 'link'">
          <DialogTitle>{{ t('pickups.introDialog.yourPersonalLinkIsYour') }}</DialogTitle>
          <DialogDescription>
            {{ t('pickups.introDialog.thereAreNoAccountsThis') }}
            <template v-if="!hasEmail">{{ t('pickups.introDialog.itIsntTheLinkYou') }}</template>
          </DialogDescription>
        </template>
        <template v-else-if="page === 'files'">
          <DialogTitle>{{ t('pickups.introDialog.photosAndVideosAsThey') }}</DialogTitle>
          <DialogDescription>{{
            t('pickups.introDialog.nothingIsCompressedUnlikeIn')
          }}</DialogDescription>
        </template>
        <template v-else>
          <DialogTitle>
            <template v-if="pickup.is_read_only">{{
              t('pickups.introDialog.readOnlyNow')
            }}</template>
            <template v-else-if="readOnly">{{
              t('pickups.introDialog.addPhotosUntilDate', { date: readOnly })
            }}</template>
            <template v-else>{{
              t('pickups.introDialog.availableUntilDate', { date: deleted })
            }}</template>
          </DialogTitle>
          <DialogDescription>
            <template v-if="readOnly">{{
              t('pickups.introDialog.afterThatNobodyAddsOr')
            }}</template>
            <template v-else>{{ t('pickups.introDialog.thenThePickupIsDeleted') }}</template>
          </DialogDescription>
        </template>
      </DialogHeader>

      <div class="space-y-3 text-sm">
        <template v-if="page === 'folder'">
          <p>{{ t('pickups.introDialog.onlyYouCanUploadRename') }}</p>
          <p v-if="pickup.visibility === 'creator'">
            {{ t('pickups.introDialog.rightNowOnlyCreatorCan', { creator }) }}
          </p>
          <p v-else>
            {{ t('pickups.introDialog.youCanLookAtEveryone') }}
            <template v-if="pickup.visibility === 'link'">{{
              t('pickups.introDialog.soCanAnyoneWhoHas')
            }}</template>
          </p>
          <p class="text-muted-foreground">
            {{
              t('pickups.introDialog.nameCanRemoveFilesIf', {
                name: pickup.creator_name || t('pickups.introDialog.theCreator'),
              })
            }}
          </p>
        </template>

        <template v-else-if="page === 'link'">
          <div class="space-y-2 rounded-xl border bg-muted/40 p-3">
            <CopyField v-if="personalUrl" :value="personalUrl" :label="t('common.personalLink')" />
            <Skeleton v-else class="h-9" />
            <p v-if="hasEmail" class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MailCheckIcon class="size-3.5 shrink-0" />
              {{ t('pickups.introDialog.alsoInYourInbox') }}
            </p>
          </div>
          <p>
            {{ t('pickups.introDialog.keepItToYourselfWhoever') }}
            {{ shareHint[0] }}<span class="font-medium">{{ t('common.share') }}</span
            >{{ shareHint[1] }}
          </p>
          <template v-if="!hasEmail">
            <form v-if="emailing" class="space-y-1.5" @submit.prevent="sendLink">
              <Label for="intro-email" class="sr-only">{{ t('common.yourEmail') }}</Label>
              <div class="flex gap-2">
                <Input
                  id="intro-email"
                  ref="emailInput"
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  :placeholder="t('common.yourEmail')"
                />
                <Button type="submit" :disabled="setEmail.isPending.value">{{
                  t('common.send')
                }}</Button>
              </div>
              <p class="text-xs text-muted-foreground">
                {{ t('pickups.introDialog.onlyForYourLinkSo') }}
              </p>
            </form>
            <Button v-else variant="ghost" size="sm" class="-ml-2.5" @click="startEmailing">
              <MailIcon />
              {{ t('pickups.introDialog.emailItToMeAs') }}
            </Button>
          </template>
          <p class="text-muted-foreground">
            <template v-if="hasEmail">{{ t('pickups.introDialog.lostItHaveItSent') }}</template>
            <template v-else>{{
              t('pickups.introDialog.lostItWithNoEmail', {
                creator,
              })
            }}</template>
            <template v-if="pickup.has_password">
              {{ t('pickups.introDialog.onANewDeviceYou') }}</template
            >
          </p>
        </template>

        <template v-else-if="page === 'files'">
          <p>
            {{ t('pickups.introDialog.uploadAsManyAsYou') }}
          </p>
          <p>{{ t('pickups.introDialog.downloadSingleFilesWholeFolders') }}</p>
        </template>

        <template v-else>
          <p v-if="readOnly && deleted">
            {{ t('pickups.introDialog.onDateItIsDeleted', { date: deleted }) }}
            {{ t('pickups.introDialog.downloadWhatYouWantTo') }}
          </p>
          <p v-else-if="deleted">{{ t('pickups.introDialog.downloadWhatYouWantTo') }}</p>
          <p v-else>{{ t('pickups.introDialog.itStaysUntilCreatorDeletes', { creator }) }}</p>
        </template>
      </div>

      <DialogFooter class="flex-row items-center justify-between gap-2 sm:justify-between">
        <div class="flex gap-1.5" aria-hidden="true">
          <span
            v-for="(_, i) in pages"
            :key="i"
            class="size-1.5 rounded-full"
            :class="i === index ? 'bg-tomato' : 'bg-muted-foreground/30'"
          />
        </div>
        <div class="flex gap-2">
          <Button v-if="index > 0" variant="ghost" @click="index--">{{ t('common.back') }}</Button>
          <Button v-if="!last" @click="index++">{{ t('common.next') }}</Button>
          <Button v-else @click="open = false">{{ t('pickups.introDialog.letsGo') }}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
