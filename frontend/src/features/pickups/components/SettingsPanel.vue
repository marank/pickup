<script setup lang="ts">
import { Trash2Icon } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import type { Pickup } from '@/api/types'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { endOfDay, formatFileSize, toDateInput } from '@/lib/format'
import { formatDate, plural, t } from '@/lib/i18n'

import { usePickupAdmin } from '../composables/usePickupAdmin'
import SettingsCard from './SettingsCard.vue'

const props = defineProps<{ pickup: Pickup }>()
const router = useRouter()
const { updateSettings, deletePickup } = usePickupAdmin(() => props.pickup.id, false)
const confirmDelete = ref(false)

const form = reactive({
  title: '',
  visibility: 'members',
  join_policy: 'open',
  email_privacy: false,
  readOnly: '',
  expires: '',
})
type Field = keyof typeof form
const today = toDateInput(new Date())
const longDate = (day: string) => formatDate(`${day}T12:00`, { dateStyle: 'long' })
const saved = (pickup: Pickup): typeof form => ({
  title: pickup.title ?? '',
  visibility: pickup.visibility,
  join_policy: pickup.join_policy,
  email_privacy: pickup.email_privacy,
  readOnly: pickup.read_only_at ? toDateInput(new Date(pickup.read_only_at)) : '',
  expires: pickup.expires_at ? toDateInput(new Date(pickup.expires_at)) : '',
})

/** Each card saves its own fields; the others keep what is typed into them. */
const cards = {
  general: ['title', 'readOnly', 'expires'],
  access: ['visibility', 'join_policy'],
  privacy: ['email_privacy'],
} satisfies Record<string, Field[]>
type Card = keyof typeof cards
const changed = (fields: Field[], against: typeof form) =>
  fields.some((field) => form[field] !== against[field])
const dirty = (card: Card) => changed(cards[card], saved(props.pickup))
function discard(card: Card) {
  const values = saved(props.pickup)
  for (const field of cards[card]) Object.assign(form, { [field]: values[field] })
}
// Start from what is saved; after a save (the pickup is refetched) refresh the cards that
// had no unsaved changes.
watch(
  () => props.pickup,
  (pickup, before) => {
    for (const card of Object.keys(cards) as Card[]) {
      if (!before || !changed(cards[card], saved(before))) discard(card)
    }
  },
  { immediate: true },
)

const visibilityOptions = [
  {
    value: 'members',
    label: () => t('Only participants'),
    hint: () => t('Recommended. Others with the link see the name of the pickup and how to join.'),
  },
  {
    value: 'link',
    label: () => t('Anyone with the link'),
    hint: () => t('Everyone who has the link can look at all photos, without joining.'),
  },
  {
    value: 'creator',
    label: () => t('Only me (paused)'),
    hint: () =>
      t(
        'Only you still see the contents. Participants can’t look or upload, and nobody can join, until you open it again.',
      ),
  },
] as const
const joinOptions = [
  {
    value: 'open',
    label: () => t('Anyone with the link'),
    hint: () => t('People pick a new name and get their own folder.'),
  },
  {
    value: 'invite',
    label: () => t('Only invited people'),
    hint: () => t('You invite people by email; each gets a personal link.'),
  },
  {
    value: 'closed',
    label: () => t('Nobody new'),
    hint: () => t('Current participants stay, nobody new can join.'),
  },
] as const
/** Both answers in one plain sentence, following the form while it is edited. */
const accessSummary = computed(() => {
  if (form.visibility === 'creator')
    return t('Paused: only you see the photos, and nobody joins or uploads.')
  const joinTexts: Record<string, () => string> = {
    open: () => t('Anyone with the share link can join and upload.'),
    invite: () => t('Only people you invite can join and upload.'),
    closed: () => t('Only the current participants upload; nobody new joins.'),
  }
  const join = joinTexts[form.join_policy]?.() ?? ''
  const see =
    form.visibility === 'link' && !props.pickup.has_password
      ? t('Anyone with the share link sees the photos, without joining.')
      : t('Only participants see the photos.')
  return `${join} ${see}`
})
const turningPrivacyOn = computed(() => form.email_privacy && !props.pickup.email_privacy)

/** The password is never shown again: a new one replaces it, or it is removed. */
const newPassword = ref('')
const passwordSaving = ref(false)
async function savePassword(password: string) {
  passwordSaving.value = true
  try {
    await updateSettings.mutateAsync({ password })
    toast.success(password ? t('Password saved') : t('Password removed'))
    newPassword.value = ''
  } catch (err) {
    toast.error(apiErrorMessage(err, t('Could not save the password')))
  } finally {
    passwordSaving.value = false
  }
}

const saving = ref<Card | null>(null)
async function save(card: Card) {
  const values: Record<string, unknown> = {}
  for (const field of cards[card]) values[field] = form[field]
  if ('title' in values) values.title = form.title.trim()
  // Unchanged dates stay as they are (an old one may lie in the past by now).
  for (const [field, key] of [
    ['readOnly', 'read_only_at'],
    ['expires', 'expires_at'],
  ] as const) {
    if (!(field in values)) continue
    delete values[field]
    if (form[field] !== saved(props.pickup)[field])
      values[key] = form[field] ? endOfDay(form[field]) : null
  }
  saving.value = card
  try {
    await updateSettings.mutateAsync(values as Parameters<typeof updateSettings.mutateAsync>[0])
    toast.success(t('Saved'))
  } catch (err) {
    toast.error(apiErrorMessage(err, t('Could not save the settings')))
  } finally {
    saving.value = null
  }
}

const storage = computed(() => {
  const { used, limit } = props.pickup.storage
  return {
    text:
      limit === null
        ? t('{size} used', { size: formatFileSize(used) })
        : t('{used} of {limit} used', {
            used: formatFileSize(used),
            limit: formatFileSize(limit),
          }),
    percent: limit ? Math.min(100, Math.round((used / limit) * 100)) : null,
  }
})

const deleteDescription = computed(() =>
  t(
    '{folders} and {files} are deleted for everyone, and all links stop working. There is no way to get them back.',
    {
      folders: plural(props.pickup.folder_count, '1 folder', '{n} folders'),
      files: plural(props.pickup.media_count, '1 file', '{n} files'),
    },
  ),
)

async function removePickup() {
  const title = props.pickup.title || t('The pickup')
  try {
    await deletePickup.mutateAsync()
    toast.success(t('{title} was deleted', { title }))
    await router.push({ name: 'home' })
  } catch (err) {
    toast.error(apiErrorMessage(err, t('Could not delete the pickup')))
  }
}
</script>

<template>
  <div class="@container max-w-4xl space-y-6">
    <div>
      <h2 class="font-heading text-xl font-semibold">{{ t('Settings') }}</h2>
      <p class="text-sm text-muted-foreground">
        {{ t('Only you as the creator can change these.') }}
      </p>
    </div>

    <SettingsCard
      :title="t('General')"
      :description="t('The name everyone sees, and when the pickup goes away.')"
      saveable
      :dirty="dirty('general')"
      :pending="saving === 'general'"
      @save="save('general')"
      @discard="discard('general')"
    >
      <div class="space-y-1.5">
        <Label for="settings-title">{{ t('Name of the pickup') }}</Label>
        <Input
          id="settings-title"
          v-model="form.title"
          maxlength="200"
          :placeholder="t('Untitled pickup')"
        />
      </div>
      <div class="space-y-1.5">
        <Label for="settings-read-only">{{ t('Read-only') }}</Label>
        <div class="flex gap-2">
          <Input
            id="settings-read-only"
            v-model="form.readOnly"
            type="date"
            :min="today"
            :max="form.expires || undefined"
            class="w-48"
            aria-describedby="settings-read-only-hint"
          />
          <Button v-if="form.readOnly" type="button" variant="ghost" @click="form.readOnly = ''">
            {{ t('Never') }}
          </Button>
        </div>
        <p id="settings-read-only-hint" class="text-sm text-muted-foreground">
          {{
            form.readOnly
              ? t(
                  'After {date} nobody joins, uploads or changes anything; everyone can still look and download. Everyone sees the date.',
                  { date: longDate(form.readOnly) },
                )
              : t('Never: people can add photos until the pickup is deleted.')
          }}
        </p>
      </div>
      <div class="space-y-1.5">
        <Label for="settings-expires">{{ t('Delete automatically') }}</Label>
        <div class="flex gap-2">
          <Input
            id="settings-expires"
            v-model="form.expires"
            type="date"
            :min="form.readOnly || today"
            class="w-48"
            aria-describedby="settings-expires-hint"
          />
          <Button v-if="form.expires" type="button" variant="ghost" @click="form.expires = ''">
            {{ t('Never') }}
          </Button>
        </div>
        <p id="settings-expires-hint" class="text-sm text-muted-foreground">
          {{
            form.expires
              ? t(
                  'At the end of {date} the pickup is deleted with all photos and videos. Everyone sees the date.',
                  { date: longDate(form.expires) },
                )
              : t('Never: the pickup stays until you delete it.')
          }}
        </p>
      </div>
    </SettingsCard>

    <SettingsCard
      :title="t('Access')"
      :description="t('Who sees the photos, and who can join with a folder of their own.')"
      saveable
      :dirty="dirty('access')"
      :pending="saving === 'access'"
      @save="save('access')"
      @discard="discard('access')"
    >
      <p class="rounded-lg bg-muted/60 px-3 py-2 text-sm" data-testid="access-summary">
        <span class="font-medium">{{ t('In short:') }}</span> {{ accessSummary }}
      </p>
      <fieldset
        v-for="group in [
          { legend: t('Who can see the photos?'), name: 'visibility', options: visibilityOptions },
          { legend: t('Who can join and upload?'), name: 'join_policy', options: joinOptions },
        ] as const"
        :key="group.name"
      >
        <legend class="mb-2 text-sm font-medium">{{ group.legend }}</legend>
        <div class="divide-y overflow-hidden rounded-lg border">
          <label
            v-for="option in group.options"
            :key="option.value"
            class="flex cursor-pointer gap-3 px-3 py-2.5 has-checked:bg-tomato/5"
          >
            <input
              v-model="form[group.name]"
              type="radio"
              :name="group.name"
              :value="option.value"
              class="mt-1 accent-tomato"
            />
            <span>
              <span class="block text-sm font-medium">{{ option.label() }}</span>
              <span class="block text-xs text-muted-foreground">
                {{ option.hint() }}
                <template v-if="option.value === 'link' && pickup.has_password">
                  {{ t('With a password, only participants see the photos.') }}
                </template>
              </span>
            </span>
          </label>
        </div>
      </fieldset>
    </SettingsCard>

    <SettingsCard
      :title="t('Password')"
      :description="
        t('People without a login need it to join or to log in with their personal link.')
      "
      saveable
      :dirty="newPassword !== ''"
      :pending="passwordSaving"
      @save="savePassword(newPassword)"
      @discard="newPassword = ''"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm">
          {{
            pickup.has_password
              ? t('This pickup is protected with a password.')
              : t('No password set.')
          }}
        </p>
        <Button
          v-if="pickup.has_password"
          type="button"
          variant="ghost"
          size="sm"
          class="text-destructive hover:text-destructive"
          :disabled="passwordSaving"
          @click="savePassword('')"
        >
          {{ t('Remove password') }}
        </Button>
      </div>
      <div class="space-y-1.5">
        <Label for="settings-password">{{
          pickup.has_password ? t('New password') : t('Password')
        }}</Label>
        <Input
          id="settings-password"
          v-model="newPassword"
          type="password"
          minlength="4"
          autocomplete="new-password"
        />
        <p v-if="newPassword" class="text-sm text-destructive">
          {{
            t(
              'Saving logs everyone else out of this pickup. They need their personal link and the password to come back. If you forget it, the server operator can remove it.',
            )
          }}
        </p>
      </div>
    </SettingsCard>

    <SettingsCard
      :title="t('Privacy')"
      :description="t('How email addresses of participants are stored.')"
      saveable
      :dirty="dirty('privacy')"
      :pending="saving === 'privacy'"
      @save="save('privacy')"
      @discard="discard('privacy')"
    >
      <label class="flex cursor-pointer gap-3">
        <input v-model="form.email_privacy" type="checkbox" class="mt-1 accent-tomato" />
        <span>
          <span class="block text-sm font-medium">{{ t('Privacy mode for email addresses') }}</span>
          <span class="block text-sm text-muted-foreground">
            {{
              t(
                "Email addresses are stored only as a hash. You can't see them, and to send an invitation again you have to enter the address again. Off: addresses are stored and shown in the list of people.",
              )
            }}
          </span>
          <span v-if="turningPrivacyOn" class="mt-1 block text-sm text-destructive">
            {{ t('Saving deletes all stored addresses of this pickup now.') }}
          </span>
        </span>
      </label>
    </SettingsCard>

    <SettingsCard
      :title="t('Storage')"
      :description="t('The server operator sets these limits. Ask them if you need more space.')"
    >
      <div
        v-if="storage.percent !== null"
        class="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        :aria-valuenow="storage.percent"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="t('Storage used')"
      >
        <div
          class="h-full rounded-full"
          :class="storage.percent >= 90 ? 'bg-destructive' : 'bg-sage'"
          :style="{ width: `${storage.percent}%` }"
        />
      </div>
      <p class="text-sm">{{ storage.text }}</p>
    </SettingsCard>

    <SettingsCard
      :title="t('Delete this pickup')"
      :description="
        t(
          'Removes the pickup with every folder, photo and video for everyone. This cannot be undone.',
        )
      "
      danger
    >
      <div>
        <Button
          variant="destructive"
          :disabled="deletePickup.isPending.value"
          @click="confirmDelete = true"
        >
          <Trash2Icon />
          {{ t('Delete pickup') }}
        </Button>
      </div>
    </SettingsCard>
  </div>

  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="t('Delete “{title}” for good?', { title: pickup.title || t('Untitled pickup') })"
    :description="deleteDescription"
    :confirm-label="t('Delete for good')"
    @confirm="removePickup"
  />
</template>
