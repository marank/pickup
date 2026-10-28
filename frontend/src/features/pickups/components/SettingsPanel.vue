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
  email_privacy: true,
  expires: '',
})
type Field = keyof typeof form
const today = toDateInput(new Date())
const saved = (pickup: Pickup): typeof form => ({
  title: pickup.title ?? '',
  visibility: pickup.visibility,
  join_policy: pickup.join_policy,
  email_privacy: pickup.email_privacy,
  expires: pickup.expires_at ? toDateInput(new Date(pickup.expires_at)) : '',
})

/** Each card saves its own fields; the others keep what is typed into them. */
const cards = {
  general: ['title', 'expires'],
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
    label: 'Only participants',
    hint: 'Recommended. Others with the link see the name of the pickup and how to join.',
  },
  {
    value: 'link',
    label: 'Anyone with the link',
    hint: 'Everyone who has the link can look at all photos, without joining.',
  },
  {
    value: 'creator',
    label: 'Nobody (closed)',
    hint: 'Only you still see the contents. Participants can’t look or upload, and nobody can join, until you open it again.',
  },
] as const
const joinOptions = [
  {
    value: 'open',
    label: 'Anyone with the link',
    hint: 'People pick a new name and get their own folder.',
  },
  {
    value: 'invite',
    label: 'Only invited people',
    hint: 'You invite people by email; each gets a personal link.',
  },
  {
    value: 'closed',
    label: 'Nobody new',
    hint: 'Current participants stay, nobody new can join.',
  },
] as const
const turningPrivacyOn = computed(() => form.email_privacy && !props.pickup.email_privacy)

const saving = ref<Card | null>(null)
async function save(card: Card) {
  const values: Record<string, unknown> = {}
  for (const field of cards[card]) values[field] = form[field]
  if ('title' in values) values.title = form.title.trim()
  if ('expires' in values) {
    delete values.expires
    // Unchanged dates stay as they are (an old one may lie in the past by now).
    if (form.expires !== saved(props.pickup).expires)
      values.expires_at = form.expires ? endOfDay(form.expires) : null
  }
  saving.value = card
  try {
    await updateSettings.mutateAsync(values as Parameters<typeof updateSettings.mutateAsync>[0])
    toast.success('Saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not save the settings'))
  } finally {
    saving.value = null
  }
}

const storage = computed(() => {
  const { used, limit } = props.pickup.storage
  return {
    text:
      limit === null
        ? `${formatFileSize(used)} used`
        : `${formatFileSize(used)} of ${formatFileSize(limit)} used`,
    percent: limit ? Math.min(100, Math.round((used / limit) * 100)) : null,
  }
})

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`
const deleteDescription = computed(
  () =>
    `${count(props.pickup.folder_count, 'folder')} and ${count(props.pickup.media_count, 'file')} are deleted for everyone, and all links stop working. There is no way to get them back.`,
)

async function removePickup() {
  const title = props.pickup.title || 'The pickup'
  try {
    await deletePickup.mutateAsync()
    toast.success(`${title} was deleted`)
    await router.push({ name: 'home' })
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not delete the pickup'))
  }
}
</script>

<template>
  <div class="@container max-w-4xl space-y-6">
    <div>
      <h2 class="font-heading text-xl font-semibold">Settings</h2>
      <p class="text-sm text-muted-foreground">Only you as the creator can change these.</p>
    </div>

    <SettingsCard
      title="General"
      description="The name everyone sees, and when the pickup goes away."
      saveable
      :dirty="dirty('general')"
      :pending="saving === 'general'"
      @save="save('general')"
      @discard="discard('general')"
    >
      <div class="space-y-1.5">
        <Label for="settings-title">Name of the pickup</Label>
        <Input
          id="settings-title"
          v-model="form.title"
          maxlength="200"
          placeholder="Untitled pickup"
        />
      </div>
      <div class="space-y-1.5">
        <Label for="settings-expires">Delete automatically</Label>
        <div class="flex gap-2">
          <Input
            id="settings-expires"
            v-model="form.expires"
            type="date"
            :min="today"
            class="w-48"
            aria-describedby="settings-expires-hint"
          />
          <Button v-if="form.expires" type="button" variant="ghost" @click="form.expires = ''">
            Never
          </Button>
        </div>
        <p id="settings-expires-hint" class="text-sm text-muted-foreground">
          {{
            form.expires
              ? `At the end of ${new Date(`${form.expires}T12:00`).toLocaleDateString(undefined, { dateStyle: 'long' })} the pickup is deleted with all photos and videos. Everyone sees the date.`
              : 'Never: the pickup stays until you delete it.'
          }}
        </p>
      </div>
    </SettingsCard>

    <SettingsCard
      title="Access"
      description="Who sees the photos, and who can join with a folder of their own."
      saveable
      :dirty="dirty('access')"
      :pending="saving === 'access'"
      @save="save('access')"
      @discard="discard('access')"
    >
      <fieldset
        v-for="group in [
          { legend: 'Who can see the photos?', name: 'visibility', options: visibilityOptions },
          { legend: 'Who can join and upload?', name: 'join_policy', options: joinOptions },
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
              <span class="block text-sm font-medium">{{ option.label }}</span>
              <span class="block text-xs text-muted-foreground">{{ option.hint }}</span>
            </span>
          </label>
        </div>
      </fieldset>
    </SettingsCard>

    <SettingsCard
      title="Privacy"
      description="How email addresses of participants are stored."
      saveable
      :dirty="dirty('privacy')"
      :pending="saving === 'privacy'"
      @save="save('privacy')"
      @discard="discard('privacy')"
    >
      <label class="flex cursor-pointer gap-3">
        <input v-model="form.email_privacy" type="checkbox" class="mt-1 accent-tomato" />
        <span>
          <span class="block text-sm font-medium">Privacy mode for email addresses</span>
          <span class="block text-sm text-muted-foreground">
            Email addresses are stored only as a hash. You can't see them, and to send an invitation
            again you have to enter the address again. Off: addresses are stored and shown in the
            list of people.
          </span>
          <span v-if="turningPrivacyOn" class="mt-1 block text-sm text-destructive">
            Saving deletes all stored addresses of this pickup now.
          </span>
        </span>
      </label>
    </SettingsCard>

    <SettingsCard
      title="Storage"
      description="The server operator sets these limits. Ask them if you need more space."
    >
      <div
        v-if="storage.percent !== null"
        class="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        :aria-valuenow="storage.percent"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Storage used"
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
      title="Delete this pickup"
      description="Removes the pickup with every folder, photo and video for everyone. This cannot be undone."
      danger
    >
      <div>
        <Button
          variant="destructive"
          :disabled="deletePickup.isPending.value"
          @click="confirmDelete = true"
        >
          <Trash2Icon />
          Delete pickup
        </Button>
      </div>
    </SettingsCard>
  </div>

  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="`Delete “${pickup.title || 'Untitled pickup'}” for good?`"
    :description="deleteDescription"
    confirm-label="Delete for good"
    @confirm="removePickup"
  />
</template>
