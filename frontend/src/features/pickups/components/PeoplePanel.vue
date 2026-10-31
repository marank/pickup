<script setup lang="ts">
import { LinkIcon, MailIcon, Trash2Icon } from '@lucide/vue'
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
import { ownerColor } from '@/lib/ownerColor'

import { usePickupAdmin } from '../composables/usePickupAdmin'
import SettingsCard from './SettingsCard.vue'

const props = defineProps<{ pickup: Pickup }>()
const admin = usePickupAdmin(() => props.pickup.id)
const members = computed(() => admin.members.data.value ?? [])

const form = reactive({ email: '', name: '' })
const removing = ref<Member | null>(null)
const confirmOpen = ref(false)

const status = (member: Member) =>
  member.is_creator
    ? 'Creator'
    : member.has_folder
      ? 'Member'
      : member.invited
        ? 'Invited, not joined yet'
        : 'No folder yet'

async function invite() {
  try {
    await admin.invite.mutateAsync({ email: form.email.trim(), name: form.name.trim() })
    toast.success(`Invitation sent to ${form.email.trim()}`)
    Object.assign(form, { email: '', name: '' })
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not send the invitation'))
  }
}

async function resend(member: Member) {
  try {
    await admin.resend.mutateAsync(member.id)
    toast.success(`Invitation sent again to ${member.email}`)
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not send the invitation'))
  }
}

async function copyLink(member: Member) {
  try {
    await copyText(admin.memberLink(member.id))
    toast.success(`Personal link of ${member.user_name || 'the invited person'} copied`, {
      description: 'Whoever opens it takes part as them, so only give it to them.',
    })
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not copy the link'))
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
    toast.success(`${member.user_name || 'The invitation'} removed`)
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not remove'))
  }
}
</script>

<template>
  <div class="@container max-w-4xl space-y-6">
    <div>
      <h2 class="font-heading text-xl font-semibold">People</h2>
      <p class="text-sm text-muted-foreground">
        <template v-if="pickup.join_policy === 'invite'"
          >Only people you invite can take part.</template
        >
        <template v-else-if="pickup.join_policy === 'closed'"
          >Nobody new can join right now.</template
        >
        <template v-else
          >Anyone with the link can join; you can also invite people by email.</template
        >
      </p>
    </div>

    <SettingsCard
      title="Invite by email"
      :description="`They get an email with a personal link from “${
        pickup.member_name === 'Creator' ? 'Someone' : pickup.member_name
      } via Pickup”. If the address is already in the pickup, the link is sent again.`"
    >
      <form class="grid gap-2 @lg:grid-cols-[1fr_1fr_auto]" @submit.prevent="invite">
        <div>
          <Label for="invite-email" class="sr-only">Email</Label>
          <Input
            id="invite-email"
            v-model="form.email"
            type="email"
            required
            placeholder="name@example.com"
          />
        </div>
        <div>
          <Label for="invite-name" class="sr-only">Name (optional)</Label>
          <Input id="invite-name" v-model="form.name" placeholder="Name (optional)" />
        </div>
        <Button type="submit" :disabled="admin.invite.isPending.value">
          <MailIcon />
          Invite
        </Button>
      </form>
    </SettingsCard>

    <SettingsCard
      title="Participants"
      :description="
        pickup.email_privacy
          ? 'Everyone with a personal link to this pickup, including invitations not accepted yet.'
          : 'Everyone with a personal link to this pickup. Privacy mode is off: addresses are stored and shown here.'
      "
    >
      <ul class="divide-y overflow-hidden rounded-lg border" aria-label="Participants">
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
              {{ member.user_name || 'Invited person' }}
              <span v-if="member.is_you" class="font-normal text-muted-foreground">(you)</span>
            </p>
            <p class="truncate text-xs text-muted-foreground">
              {{ status(member) }}
              <template v-if="member.email"> · {{ member.email }}</template>
              <template v-else-if="member.has_email"> · email stored privately</template>
              ·
              {{
                member.has_folder
                  ? `active ${formatRelativeDate(member.last_active_at)}`
                  : `added ${formatRelativeDate(member.created_at)}`
              }}
            </p>
          </div>
          <Button
            v-if="!member.is_you"
            variant="ghost"
            size="icon-sm"
            :aria-label="`Copy the personal link of ${member.user_name || 'the invited person'}`"
            title="Copy their personal link, if they lost it"
            @click="copyLink(member)"
          >
            <LinkIcon />
          </Button>
          <Button
            v-if="member.email && !member.is_creator"
            variant="ghost"
            size="icon-sm"
            :aria-label="`Send the invitation to ${member.user_name || member.email} again`"
            title="Send the link again"
            @click="resend(member)"
          >
            <MailIcon />
          </Button>
          <Button
            v-if="!member.is_creator"
            variant="ghost"
            size="icon-sm"
            class="text-destructive hover:text-destructive"
            :aria-label="`Remove ${member.user_name || 'invitation'}`"
            @click="askRemove(member)"
          >
            <Trash2Icon />
          </Button>
        </li>
      </ul>
    </SettingsCard>
  </div>

  <ConfirmDialog
    v-model:open="confirmOpen"
    :title="`Remove ${removing?.user_name || 'this invitation'}?`"
    description="Their personal link stops working, and their folder with everything in it is deleted for everyone. This cannot be undone."
    confirm-label="Remove"
    @confirm="remove"
  />
</template>
