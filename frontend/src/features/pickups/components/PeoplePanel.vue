<script setup lang="ts">
import { LinkIcon, MailIcon, MailPlusIcon, Trash2Icon } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import type { Member, Pickup } from '@/api/types'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { copyText } from '@/lib/clipboard'
import { formatRelativeDate } from '@/lib/format'
import { t } from '@/lib/i18n'
import { ownerColor } from '@/lib/ownerColor'

import { usePickupAdmin } from '../composables/usePickupAdmin'
import MemberEmailDialog from './MemberEmailDialog.vue'
import SettingsCard from './SettingsCard.vue'

const props = defineProps<{ pickup: Pickup }>()
const admin = usePickupAdmin(() => props.pickup.id)
const members = computed(() => admin.members.data.value ?? [])

const form = reactive({ email: '', name: '' })
const removing = ref<Member | null>(null)
const confirmOpen = ref(false)
const addingEmail = ref<Member | null>(null)
const emailOpen = ref(false)

function askEmail(member: Member) {
  addingEmail.value = member
  emailOpen.value = true
}

// The sender's name as the email shows it (the mail itself is not translated).
const sender = computed(
  () =>
    `${props.pickup.member_name === 'Creator' ? 'Someone' : props.pickup.member_name} via Pickup`,
)

const status = (member: Member) =>
  member.is_creator
    ? t('Creator')
    : member.has_folder
      ? t('Member')
      : member.invited
        ? t('Invited, not joined yet')
        : t('No folder yet')

async function invite() {
  try {
    await admin.invite.mutateAsync({ email: form.email.trim(), name: form.name.trim() })
    toast.success(t('Invitation sent to {email}', { email: form.email.trim() }))
    Object.assign(form, { email: '', name: '' })
  } catch (err) {
    toast.error(apiErrorMessage(err, t('Could not send the invitation')))
  }
}

async function resend(member: Member) {
  try {
    await admin.resend.mutateAsync(member.id)
    toast.success(t('Invitation sent again to {email}', { email: member.email ?? '' }))
  } catch (err) {
    toast.error(apiErrorMessage(err, t('Could not send the invitation')))
  }
}

async function copyLink(member: Member) {
  try {
    await copyText(admin.memberLink(member.id))
    toast.success(
      t('Personal link of {name} copied', { name: member.user_name || t('the invited person') }),
      { description: t('Whoever opens it takes part as them, so only give it to them.') },
    )
  } catch (err) {
    toast.error(apiErrorMessage(err, t('Could not copy the link')))
  }
}

function askRemove(member: Member) {
  removing.value = member
  confirmOpen.value = true
}

async function remove() {
  const member = removing.value
  if (!member) return
  try {
    await admin.remove.mutateAsync(member.id)
    toast.success(t('{name} removed', { name: member.user_name || t('The invitation') }))
  } catch (err) {
    toast.error(apiErrorMessage(err, t('Could not remove')))
  }
}
</script>

<template>
  <div class="@container max-w-4xl space-y-6">
    <div>
      <h2 class="font-heading text-xl font-semibold">{{ t('People') }}</h2>
      <p class="text-sm text-muted-foreground">
        <template v-if="pickup.join_policy === 'invite'">{{
          t('Only people you invite can take part.')
        }}</template>
        <template v-else-if="pickup.join_policy === 'closed'">{{
          t('Nobody new can join right now.')
        }}</template>
        <template v-else>{{
          t('Anyone with the link can join; you can also invite people by email.')
        }}</template>
      </p>
    </div>

    <SettingsCard
      :title="t('Invite by email')"
      :description="
        t(
          'They get an email with a personal link from “{sender}”. If the address is already in the pickup, the link is sent again.',
          { sender },
        )
      "
    >
      <form class="grid gap-2 @lg:grid-cols-[1fr_1fr_auto]" @submit.prevent="invite">
        <div>
          <Label for="invite-email" class="sr-only">{{ t('Email') }}</Label>
          <Input
            id="invite-email"
            v-model="form.email"
            type="email"
            required
            placeholder="name@example.com"
          />
        </div>
        <div>
          <Label for="invite-name" class="sr-only">{{ t('Name (optional)') }}</Label>
          <Input id="invite-name" v-model="form.name" :placeholder="t('Name (optional)')" />
        </div>
        <Button type="submit" :disabled="admin.invite.isPending.value">
          <MailIcon />
          {{ t('Invite') }}
        </Button>
      </form>
    </SettingsCard>

    <SettingsCard
      :title="t('Participants')"
      :description="
        pickup.email_privacy
          ? t(
              'Everyone with a personal link to this pickup, including invitations not accepted yet.',
            )
          : t(
              'Everyone with a personal link to this pickup. Privacy mode is off: addresses are stored and shown here.',
            )
      "
    >
      <ul class="divide-y overflow-hidden rounded-lg border" :aria-label="t('Participants')">
        <li v-for="member in members" :key="member.id" class="flex items-center gap-3 px-3 py-2.5">
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-paper"
            :style="{
              background: member.has_folder
                ? ownerColor(member.user_name)
                : 'var(--muted-foreground)',
            }"
          >
            {{ (member.user_name || '?').slice(0, 1).toUpperCase() }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">
              {{ member.user_name || t('Invited person') }}
              <span v-if="member.is_you" class="font-normal text-muted-foreground">{{
                t('(you)')
              }}</span>
            </p>
            <p class="truncate text-xs text-muted-foreground">
              {{ status(member) }}
              <template v-if="member.email"> · {{ member.email }}</template>
              <template v-else-if="member.has_email"> · {{ t('email stored privately') }}</template>
              ·
              {{
                member.has_folder
                  ? t('active {when}', { when: formatRelativeDate(member.last_active_at) })
                  : t('added {when}', { when: formatRelativeDate(member.created_at) })
              }}
            </p>
          </div>
          <Button
            v-if="!member.is_you"
            variant="ghost"
            size="icon-sm"
            :aria-label="
              t('Copy the personal link of {name}', {
                name: member.user_name || t('the invited person'),
              })
            "
            :title="t('Copy their personal link, if they lost it')"
            @click="copyLink(member)"
          >
            <LinkIcon />
          </Button>
          <Button
            v-if="!member.has_email && !member.is_you"
            variant="ghost"
            size="icon-sm"
            :aria-label="t('Add an email for {name}', { name: member.user_name })"
            :title="t('Add their email and send them their link')"
            @click="askEmail(member)"
          >
            <MailPlusIcon />
          </Button>
          <Button
            v-if="member.email && !member.is_creator"
            variant="ghost"
            size="icon-sm"
            :aria-label="
              t('Send the invitation to {name} again', {
                name: member.user_name || member.email || '',
              })
            "
            :title="t('Send the link again')"
            @click="resend(member)"
          >
            <MailIcon />
          </Button>
          <Button
            v-if="!member.is_creator"
            variant="ghost"
            size="icon-sm"
            class="text-destructive hover:text-destructive"
            :aria-label="t('Remove {name}', { name: member.user_name || t('invitation') })"
            @click="askRemove(member)"
          >
            <Trash2Icon />
          </Button>
        </li>
      </ul>
    </SettingsCard>
  </div>

  <MemberEmailDialog v-model:open="emailOpen" :pickup="pickup" :member="addingEmail" />

  <ConfirmDialog
    v-model:open="confirmOpen"
    :title="t('Remove {name}?', { name: removing?.user_name || t('this invitation') })"
    :description="
      t(
        'Their personal link stops working, and their folder with everything in it is deleted for everyone. This cannot be undone.',
      )
    "
    :confirm-label="t('Remove')"
    @confirm="remove"
  />
</template>
