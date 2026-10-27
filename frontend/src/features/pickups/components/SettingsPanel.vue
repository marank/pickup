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
const savedExpiry = () =>
  props.pickup.expires_at ? toDateInput(new Date(props.pickup.expires_at)) : ''
const today = toDateInput(new Date())
const reset = () =>
  Object.assign(form, {
    title: props.pickup.title ?? '',
    visibility: props.pickup.visibility,
    join_policy: props.pickup.join_policy,
    email_privacy: props.pickup.email_privacy,
    expires: savedExpiry(),
  })
// Start from what is saved, and again after saving (the pickup is refetched).
watch(() => props.pickup, reset, { immediate: true })
const dirty = computed(
  () =>
    form.title !== (props.pickup.title ?? '') ||
    form.visibility !== props.pickup.visibility ||
    form.join_policy !== props.pickup.join_policy ||
    form.email_privacy !== props.pickup.email_privacy ||
    form.expires !== savedExpiry(),
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
    hint: 'Everyone who is in stays in, nobody new can join.',
  },
] as const
const turningPrivacyOn = computed(() => form.email_privacy && !props.pickup.email_privacy)

async function save() {
  try {
    const { expires, ...settings } = form
    await updateSettings.mutateAsync({
      ...settings,
      title: form.title.trim(),
      // Unchanged dates stay as they are (an old one may lie in the past by now).
      ...(expires !== savedExpiry() && { expires_at: expires ? endOfDay(expires) : null }),
    } as Parameters<typeof updateSettings.mutateAsync>[0])
    toast.success('Settings saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not save the settings'))
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
  <form class="max-w-2xl space-y-6" aria-label="Pickup settings" @submit.prevent="save">
    <div>
      <h2 class="font-heading text-xl font-semibold">Settings</h2>
      <p class="text-sm text-muted-foreground">Only you as the creator can change these.</p>
    </div>

    <div class="space-y-1.5">
      <Label for="settings-title">Name of the pickup</Label>
      <Input
        id="settings-title"
        v-model="form.title"
        maxlength="200"
        placeholder="Untitled pickup"
      />
    </div>

    <fieldset class="space-y-2">
      <legend class="mb-1 text-sm font-medium">Who can see the photos?</legend>
      <label
        v-for="option in visibilityOptions"
        :key="option.value"
        class="flex cursor-pointer gap-3 rounded-lg border p-3 has-checked:border-tomato has-checked:bg-tomato/5"
      >
        <input
          v-model="form.visibility"
          type="radio"
          name="visibility"
          :value="option.value"
          class="mt-1 accent-tomato"
        />
        <span>
          <span class="block text-sm font-medium">{{ option.label }}</span>
          <span class="block text-sm text-muted-foreground">{{ option.hint }}</span>
        </span>
      </label>
    </fieldset>

    <fieldset class="space-y-2">
      <legend class="mb-1 text-sm font-medium">Who can join and upload?</legend>
      <label
        v-for="option in joinOptions"
        :key="option.value"
        class="flex cursor-pointer gap-3 rounded-lg border p-3 has-checked:border-tomato has-checked:bg-tomato/5"
      >
        <input
          v-model="form.join_policy"
          type="radio"
          name="join_policy"
          :value="option.value"
          class="mt-1 accent-tomato"
        />
        <span>
          <span class="block text-sm font-medium">{{ option.label }}</span>
          <span class="block text-sm text-muted-foreground">{{ option.hint }}</span>
        </span>
      </label>
    </fieldset>

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

    <label class="flex cursor-pointer gap-3 rounded-lg border p-3">
      <input v-model="form.email_privacy" type="checkbox" class="mt-1 accent-tomato" />
      <span>
        <span class="block text-sm font-medium">Privacy mode for email addresses</span>
        <span class="block text-sm text-muted-foreground">
          Addresses are stored only as an unreadable fingerprint — enough to send someone their own
          link when they type their address. You won't see addresses, and resending an invitation
          needs the address again. Off: addresses are stored and you see them in the list of people.
        </span>
        <span v-if="turningPrivacyOn" class="mt-1 block text-sm text-destructive">
          Saving deletes all stored addresses of this pickup now.
        </span>
      </span>
    </label>

    <div class="flex gap-2">
      <Button type="submit" :disabled="!dirty || updateSettings.isPending.value">
        Save changes
      </Button>
      <Button v-if="dirty" type="button" variant="ghost" @click="reset">Discard</Button>
    </div>
  </form>

  <section class="mt-10 max-w-2xl space-y-2" aria-label="Storage">
    <h3 class="font-medium">Storage</h3>
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
    <p class="text-sm text-muted-foreground">
      The limits are set by whoever runs this server; ask them if you need more space.
    </p>
  </section>

  <section
    class="mt-10 max-w-2xl space-y-3 rounded-xl border border-destructive/40 p-4"
    aria-label="Delete pickup"
  >
    <div>
      <h3 class="font-medium text-destructive">Delete this pickup</h3>
      <p class="text-sm text-muted-foreground">
        Removes the pickup with every folder, photo and video for everyone. This cannot be undone.
      </p>
    </div>
    <Button
      variant="destructive"
      :disabled="deletePickup.isPending.value"
      @click="confirmDelete = true"
    >
      <Trash2Icon />
      Delete pickup
    </Button>
  </section>

  <ConfirmDialog
    v-model:open="confirmDelete"
    :title="`Delete “${pickup.title || 'Untitled pickup'}” for good?`"
    :description="deleteDescription"
    confirm-label="Delete for good"
    @confirm="removePickup"
  />
</template>
