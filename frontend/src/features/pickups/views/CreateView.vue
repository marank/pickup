<script setup lang="ts">
import { ArrowLeftIcon, ArrowRightIcon, LinkIcon, MailIcon } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { ApiError, apiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useCreatePickup } from '../composables/usePickup'

const router = useRouter()
const createPickup = useCreatePickup()
const form = reactive({ title: '', creator_name: '', creator_email: '', join_policy: 'open' })
const fieldErrors = ref<Record<string, string>>({})

const policies = [
  {
    value: 'open',
    icon: LinkIcon,
    label: 'Anyone with the link',
    hint: 'Send the link around; everyone picks a name and gets a folder.',
  },
  {
    value: 'invite',
    icon: MailIcon,
    label: 'Only people I invite',
    hint: 'You invite people by email; each gets a personal link.',
  },
] as const

async function submit() {
  fieldErrors.value = {}
  try {
    const created = await createPickup.mutateAsync({
      title: form.title.trim(),
      creator_name: form.creator_name.trim(),
      creator_email: form.creator_email.trim(),
      join_policy: form.join_policy as 'open' | 'invite',
    })
    await router.push({
      name: 'explorer',
      params: { pickupId: created.id },
      query: { welcome: '1' },
    })
  } catch (err) {
    if (err instanceof ApiError && err.body && typeof err.body === 'object') {
      for (const [field, messages] of Object.entries(err.body)) {
        if (Array.isArray(messages)) fieldErrors.value[field] = String(messages[0])
      }
    }
    toast.error(apiErrorMessage(err, 'Could not create the pickup'))
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl py-4 sm:py-8">
    <RouterLink
      :to="{ name: 'home' }"
      class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon class="size-4" />
      Back
    </RouterLink>
    <form
      class="tag-hole space-y-6 rounded-2xl rounded-l-[2rem] border bg-card p-6 pl-10 shadow-sm"
      aria-label="New pickup"
      @submit.prevent="submit"
    >
      <div class="space-y-1">
        <h1 class="font-heading text-2xl font-bold">Start a pickup</h1>
        <p class="text-muted-foreground">
          A shared place for everyone's photos and videos. No accounts needed — not for you, not for
          your guests.
        </p>
      </div>

      <div class="space-y-1.5">
        <Label for="create-title">Name of the pickup</Label>
        <Input
          id="create-title"
          v-model="form.title"
          required
          maxlength="200"
          placeholder="e.g. Anna & Mark’s wedding"
          autocomplete="off"
        />
        <p v-if="fieldErrors.title" class="text-sm text-destructive">{{ fieldErrors.title }}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="create-name"
            >Your name <span class="text-muted-foreground">(optional)</span></Label
          >
          <Input id="create-name" v-model="form.creator_name" maxlength="100" autocomplete="name" />
          <p class="text-xs text-muted-foreground">You get a folder with this name right away.</p>
        </div>
        <div class="space-y-1.5">
          <Label for="create-email"
            >Your email <span class="text-muted-foreground">(optional)</span></Label
          >
          <Input id="create-email" v-model="form.creator_email" type="email" autocomplete="email" />
          <p class="text-xs text-muted-foreground">We send you your link to get back in.</p>
          <p v-if="fieldErrors.creator_email" class="text-sm text-destructive">
            {{ fieldErrors.creator_email }}
          </p>
        </div>
      </div>

      <fieldset class="space-y-2">
        <legend class="mb-1 text-sm font-medium">Who can join?</legend>
        <div class="grid gap-2 sm:grid-cols-2">
          <label
            v-for="policy in policies"
            :key="policy.value"
            class="flex cursor-pointer flex-col gap-1 rounded-xl border p-3 has-checked:border-tomato has-checked:bg-tomato/5"
          >
            <span class="flex items-center gap-2 text-sm font-medium">
              <input
                v-model="form.join_policy"
                type="radio"
                name="join_policy"
                :value="policy.value"
                class="accent-tomato"
              />
              <component :is="policy.icon" class="size-4 text-muted-foreground" />
              {{ policy.label }}
            </span>
            <span class="text-sm text-muted-foreground">{{ policy.hint }}</span>
          </label>
        </div>
        <p class="text-xs text-muted-foreground">
          Only participants see the photos. You can change this and more later in the settings.
        </p>
      </fieldset>

      <Button type="submit" size="lg" class="w-full" :disabled="createPickup.isPending.value">
        {{ createPickup.isPending.value ? 'Creating…' : 'Create pickup' }}
        <ArrowRightIcon />
      </Button>
    </form>
  </div>
</template>
