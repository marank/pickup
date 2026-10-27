<script setup lang="ts">
import { MailIcon, Trash2Icon } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import type { Member, Pickup } from '@/api/types'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatRelativeDate } from '@/lib/format'
import { ownerColor } from '@/lib/ownerColor'

import { usePickupAdmin } from '../composables/usePickupAdmin'

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
  <section class="max-w-3xl space-y-5" aria-label="People">
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

    <form class="space-y-2 rounded-xl border bg-pane p-3" @submit.prevent="invite">
      <p class="text-sm font-medium">Invite by email</p>
      <div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
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
      </div>
      <p class="text-xs text-muted-foreground">
        They get a personal link from “{{
          pickup.member_name === 'Creator' ? 'Someone' : pickup.member_name
        }}
        via Pickup”. Inviting an address that is already here sends its link again.
      </p>
    </form>

    <ul class="divide-y rounded-xl border" aria-label="Participants">
      <li v-for="member in members" :key="member.id" class="flex items-center gap-3 p-3">
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
    <p v-if="!pickup.email_privacy" class="text-xs text-muted-foreground">
      Privacy mode is off: addresses are stored and shown here.
    </p>
  </section>

  <ConfirmDialog
    v-model:open="confirmOpen"
    :title="`Remove ${removing?.user_name || 'this invitation'}?`"
    description="Their personal link stops working, and their folder with everything in it is deleted for everyone. This cannot be undone."
    confirm-label="Remove"
    @confirm="remove"
  />
</template>
