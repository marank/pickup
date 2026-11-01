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
    ? t('pickups.peoplePanel.creator')
    : member.has_folder
      ? t('pickups.peoplePanel.member')
      : member.invited
        ? t('pickups.peoplePanel.invitedNotJoinedYet')
        : t('pickups.peoplePanel.noFolderYet')

async function invite() {
  try {
    await admin.invite.mutateAsync({ email: form.email.trim(), name: form.name.trim() })
    toast.success(t('pickups.peoplePanel.invitationSentToEmail', { email: form.email.trim() }))
    Object.assign(form, { email: '', name: '' })
  } catch (err) {
    toast.error(apiErrorMessage(err, t('pickups.peoplePanel.couldNotSendTheInvitation')))
  }
}

async function resend(member: Member) {
  try {
    await admin.resend.mutateAsync(member.id)
    toast.success(
      t('pickups.peoplePanel.invitationSentAgainToEmail', { email: member.email ?? '' }),
    )
  } catch (err) {
    toast.error(apiErrorMessage(err, t('pickups.peoplePanel.couldNotSendTheInvitation')))
  }
}

async function copyLink(member: Member) {
  try {
    await copyText(admin.memberLink(member.id))
    toast.success(
      t('pickups.peoplePanel.personalLinkOfNameCopied', {
        name: member.user_name || t('pickups.peoplePanel.theInvitedPerson'),
      }),
      { description: t('pickups.peoplePanel.whoeverOpensItTakesPart') },
    )
  } catch (err) {
    toast.error(apiErrorMessage(err, t('pickups.peoplePanel.couldNotCopyTheLink')))
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
    toast.success(
      t('pickups.peoplePanel.nameRemoved', {
        name: member.user_name || t('pickups.peoplePanel.theInvitation'),
      }),
    )
  } catch (err) {
    toast.error(apiErrorMessage(err, t('pickups.peoplePanel.couldNotRemove')))
  }
}
</script>

<template>
  <div class="@container max-w-4xl space-y-6">
    <div>
      <h2 class="font-heading text-xl font-semibold">{{ t('common.people') }}</h2>
      <p class="text-sm text-muted-foreground">
        <template v-if="pickup.join_policy === 'invite'">{{
          t('pickups.peoplePanel.onlyPeopleYouInviteCan')
        }}</template>
        <template v-else-if="pickup.join_policy === 'closed'">{{
          t('common.nobodyNewCanJoinRight')
        }}</template>
        <template v-else>{{ t('pickups.peoplePanel.anyoneWithTheLinkCan') }}</template>
      </p>
    </div>

    <SettingsCard
      :title="t('pickups.peoplePanel.inviteByEmail')"
      :description="t('pickups.peoplePanel.theyGetAnEmailWith', { sender })"
    >
      <form class="grid gap-2 @lg:grid-cols-[1fr_1fr_auto]" @submit.prevent="invite">
        <div>
          <Label for="invite-email" class="sr-only">{{ t('common.email') }}</Label>
          <Input
            id="invite-email"
            v-model="form.email"
            type="email"
            required
            placeholder="name@example.com"
          />
        </div>
        <div>
          <Label for="invite-name" class="sr-only">{{
            t('pickups.peoplePanel.nameOptional')
          }}</Label>
          <Input
            id="invite-name"
            v-model="form.name"
            :placeholder="t('pickups.peoplePanel.nameOptional')"
          />
        </div>
        <Button type="submit" :disabled="admin.invite.isPending.value">
          <MailIcon />
          {{ t('pickups.peoplePanel.invite') }}
        </Button>
      </form>
    </SettingsCard>

    <SettingsCard
      :title="t('pickups.peoplePanel.participants')"
      :description="
        pickup.email_privacy
          ? t('pickups.peoplePanel.everyoneWithAPersonalLink2')
          : t('pickups.peoplePanel.everyoneWithAPersonalLink')
      "
    >
      <ul
        class="divide-y overflow-hidden rounded-lg border"
        :aria-label="t('pickups.peoplePanel.participants')"
      >
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
              {{ member.user_name || t('pickups.peoplePanel.invitedPerson') }}
              <span v-if="member.is_you" class="font-normal text-muted-foreground">{{
                t('pickups.peoplePanel.you')
              }}</span>
            </p>
            <p class="truncate text-xs text-muted-foreground">
              {{ status(member) }}
              <template v-if="member.email"> · {{ member.email }}</template>
              <template v-else-if="member.has_email">
                · {{ t('pickups.peoplePanel.emailStoredPrivately') }}</template
              >
              ·
              {{
                member.has_folder
                  ? t('pickups.peoplePanel.activeWhen', {
                      when: formatRelativeDate(member.last_active_at),
                    })
                  : t('pickups.peoplePanel.addedWhen', {
                      when: formatRelativeDate(member.created_at),
                    })
              }}
            </p>
          </div>
          <Button
            v-if="!member.is_you"
            variant="ghost"
            size="icon-sm"
            :aria-label="
              t('pickups.peoplePanel.copyThePersonalLinkOf', {
                name: member.user_name || t('pickups.peoplePanel.theInvitedPerson'),
              })
            "
            :title="t('pickups.peoplePanel.copyTheirPersonalLinkIf')"
            @click="copyLink(member)"
          >
            <LinkIcon />
          </Button>
          <Button
            v-if="!member.has_email && !member.is_you"
            variant="ghost"
            size="icon-sm"
            :aria-label="t('common.addAnEmailForName', { name: member.user_name })"
            :title="t('pickups.peoplePanel.addTheirEmailAndSend')"
            @click="askEmail(member)"
          >
            <MailPlusIcon />
          </Button>
          <Button
            v-if="member.email && !member.is_creator"
            variant="ghost"
            size="icon-sm"
            :aria-label="
              t('pickups.peoplePanel.sendTheInvitationToName', {
                name: member.user_name || member.email || '',
              })
            "
            :title="t('pickups.peoplePanel.sendTheLinkAgain')"
            @click="resend(member)"
          >
            <MailIcon />
          </Button>
          <Button
            v-if="!member.is_creator"
            variant="ghost"
            size="icon-sm"
            class="text-destructive hover:text-destructive"
            :aria-label="
              t('pickups.peoplePanel.removeName2', {
                name: member.user_name || t('pickups.peoplePanel.invitation'),
              })
            "
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
    :title="
      t('pickups.peoplePanel.removeName', {
        name: removing?.user_name || t('pickups.peoplePanel.thisInvitation'),
      })
    "
    :description="t('pickups.peoplePanel.theirPersonalLinkStopsWorking')"
    :confirm-label="t('pickups.peoplePanel.remove')"
    @confirm="remove"
  />
</template>
