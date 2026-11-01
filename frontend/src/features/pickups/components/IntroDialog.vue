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

const creator = computed(() => props.pickup.creator_name || 'the creator')
const longDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' }) : ''
const readOnly = computed(() => longDate(props.pickup.read_only_at))
const deleted = computed(() => longDate(props.pickup.expires_at))

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
    toast.success(message || 'Check your inbox for your personal link')
    await client.invalidateQueries({ queryKey: pickupKeys.link(props.pickup.id) })
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not send the mail'))
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <component :is="ICONS[page]" class="mb-1 size-8 text-tomato" aria-hidden="true" />
        <template v-if="page === 'folder'">
          <DialogTitle>This is your folder</DialogTitle>
          <DialogDescription>Everything you add goes into your own folder.</DialogDescription>
        </template>
        <template v-else-if="page === 'link'">
          <DialogTitle>Your personal link is your key</DialogTitle>
          <DialogDescription>
            There are no accounts: this link logs you in, on any device.
            <template v-if="!hasEmail">It isn't the link you joined with.</template>
          </DialogDescription>
        </template>
        <template v-else-if="page === 'files'">
          <DialogTitle>Photos and videos, as they are</DialogTitle>
          <DialogDescription>Nothing is compressed, unlike in chat apps.</DialogDescription>
        </template>
        <template v-else>
          <DialogTitle>
            <template v-if="pickup.is_read_only">Read-only now</template>
            <template v-else-if="readOnly">Add photos until {{ readOnly }}</template>
            <template v-else>Available until {{ deleted }}</template>
          </DialogTitle>
          <DialogDescription>
            <template v-if="readOnly"
              >After that nobody adds or changes anything; looking and downloading go on.</template
            >
            <template v-else>Then the pickup is deleted with everything in it.</template>
          </DialogDescription>
        </template>
      </DialogHeader>

      <div class="space-y-3 text-sm">
        <template v-if="page === 'folder'">
          <p>Only you can upload, rename and delete in it, and make subfolders.</p>
          <p v-if="pickup.visibility === 'creator'">
            Right now only {{ creator }} can see the folders, yours included.
          </p>
          <p v-else>
            You can look at everyone else's folders and download from them; they can see
            yours.<template v-if="pickup.visibility === 'link'">
              So can anyone who has the pickup's link.</template
            >
          </p>
          <p class="text-muted-foreground">
            {{ pickup.creator_name || 'The creator' }} can remove files if needed.
          </p>
        </template>

        <template v-else-if="page === 'link'">
          <div class="space-y-2 rounded-xl border bg-muted/40 p-3">
            <CopyField v-if="personalUrl" :value="personalUrl" label="Personal link" />
            <Skeleton v-else class="h-9" />
            <p v-if="hasEmail" class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MailCheckIcon class="size-3.5 shrink-0" />
              Also in your inbox.
            </p>
          </div>
          <p>
            Keep it to yourself: whoever opens it is you here. To invite others, use
            <span class="font-medium">Share</span> at the top.
          </p>
          <template v-if="!hasEmail">
            <form v-if="emailing" class="space-y-1.5" @submit.prevent="sendLink">
              <Label for="intro-email" class="sr-only">Your email</Label>
              <div class="flex gap-2">
                <Input
                  id="intro-email"
                  ref="emailInput"
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="Your email"
                />
                <Button type="submit" :disabled="setEmail.isPending.value">Send</Button>
              </div>
              <p class="text-xs text-muted-foreground">
                Only for your link, so you can request it again yourself.
              </p>
            </form>
            <Button v-else variant="ghost" size="sm" class="-ml-2.5" @click="startEmailing">
              <MailIcon />
              Email it to me as well
            </Button>
          </template>
          <p class="text-muted-foreground">
            <template v-if="hasEmail"
              >Lost it? Have it sent to your address again from the pickup's page.</template
            >
            <template v-else
              >Lost it, with no email stored? Only {{ creator }} can give you a new one.</template
            >
            <template v-if="pickup.has_password">
              On a new device you also need the pickup's password.</template
            >
          </p>
        </template>

        <template v-else-if="page === 'files'">
          <p>Upload as many as you like at once, large videos too; they keep full quality.</p>
          <p>Download single files, whole folders, or everything as a ZIP.</p>
        </template>

        <template v-else>
          <p v-if="readOnly && deleted">
            On {{ deleted }} it is deleted with everything in it. Download what you want to keep
            before then.
          </p>
          <p v-else-if="deleted">Download what you want to keep before then.</p>
          <p v-else>It stays until {{ creator }} deletes it.</p>
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
          <Button v-if="index > 0" variant="ghost" @click="index--">Back</Button>
          <Button v-if="!last" @click="index++">Next</Button>
          <Button v-else @click="open = false">Let's go</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
