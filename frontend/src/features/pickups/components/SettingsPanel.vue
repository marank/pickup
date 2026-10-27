<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import type { Pickup } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { usePickupAdmin } from '../composables/usePickupAdmin'

const props = defineProps<{ pickup: Pickup }>()
const { updateSettings } = usePickupAdmin(() => props.pickup.id, false)

const form = reactive({
  title: '',
  visibility: 'members',
  join_policy: 'open',
  email_privacy: true,
})
const reset = () =>
  Object.assign(form, {
    title: props.pickup.title ?? '',
    visibility: props.pickup.visibility,
    join_policy: props.pickup.join_policy,
    email_privacy: props.pickup.email_privacy,
  })
// Start from what is saved, and again after saving (the pickup is refetched).
watch(() => props.pickup, reset, { immediate: true })
const dirty = computed(
  () =>
    form.title !== (props.pickup.title ?? '') ||
    form.visibility !== props.pickup.visibility ||
    form.join_policy !== props.pickup.join_policy ||
    form.email_privacy !== props.pickup.email_privacy,
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
    await updateSettings.mutateAsync({ ...form, title: form.title.trim() } as Parameters<
      typeof updateSettings.mutateAsync
    >[0])
    toast.success('Settings saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not save the settings'))
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
</template>
