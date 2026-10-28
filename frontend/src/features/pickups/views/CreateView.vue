<script setup lang="ts">
import { ArrowLeftIcon, ArrowRightIcon, DownloadIcon, LinkIcon, MailIcon } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'

import { ApiError, apiErrorMessage } from '@/api/errors'
import type { CreatedPickup } from '@/api/types'
import CopyField from '@/components/CopyField.vue'
import QrCard from '@/components/QrCard.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useCreatePickup } from '../composables/usePickup'

const createPickup = useCreatePickup()
/** Step 2: the new pickup and whether its creator link went out by mail. */
const created = ref<CreatedPickup | null>(null)
const emailed = ref(false)
const qr = ref<InstanceType<typeof QrCard> | null>(null)
const absolute = (path: string) => `${window.location.origin}${path}`
const shareUrl = computed(() => (created.value ? absolute(`/pickup/${created.value.id}`) : ''))
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
    created.value = await createPickup.mutateAsync({
      title: form.title.trim(),
      creator_name: form.creator_name.trim(),
      creator_email: form.creator_email.trim(),
      join_policy: form.join_policy as 'open' | 'invite',
    })
    emailed.value = Boolean(form.creator_email.trim())
    window.scrollTo({ top: 0 })
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
    <div class="mb-4 flex items-center gap-3 text-sm">
      <RouterLink
        v-if="!created"
        :to="{ name: 'home' }"
        class="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon class="size-4" />
        Back
      </RouterLink>
      <ol class="ml-auto flex items-center gap-2 text-muted-foreground" aria-label="Steps">
        <li
          v-for="(step, index) in ['Details', 'Links']"
          :key="step"
          class="flex items-center gap-1.5"
          :aria-current="(index === 0) === !created ? 'step' : undefined"
        >
          <span
            class="flex size-5 items-center justify-center rounded-full text-xs font-semibold"
            :class="(index === 0) === !created ? 'bg-tomato text-paper' : 'bg-muted'"
            >{{ index + 1 }}</span
          >
          <span :class="(index === 0) === !created && 'font-medium text-foreground'">{{
            step
          }}</span>
        </li>
      </ol>
    </div>

    <section
      v-if="created"
      class="tag-hole space-y-6 rounded-2xl rounded-l-[2rem] border bg-card p-6 pl-10 shadow-sm"
      aria-label="Your pickup is ready"
    >
      <div class="space-y-1">
        <h1 class="font-heading text-2xl font-bold">
          “{{ created.title || 'Untitled pickup' }}” is ready
        </h1>
        <p class="text-muted-foreground">Two links, two jobs.</p>
      </div>

      <div class="space-y-2">
        <p class="font-medium">
          Share link <span class="font-normal text-muted-foreground">— for everyone else</span>
        </p>
        <CopyField :value="shareUrl" label="Share link" />
        <div class="flex items-center gap-4 rounded-xl border bg-pane p-3">
          <QrCard
            ref="qr"
            :value="shareUrl"
            :title="created.title || 'Untitled pickup'"
            class="w-24 shrink-0"
          />
          <div class="space-y-2 text-sm">
            <p class="text-muted-foreground">
              The same link as QR card, for a table card, a poster or a slide at the party.
            </p>
            <Button variant="outline" size="sm" @click="qr?.save()">
              <DownloadIcon />
              Save QR card
            </Button>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <p class="font-medium">
          Your creator link <span class="font-normal text-muted-foreground">— only for you</span>
        </p>
        <CopyField :value="absolute(created.member_url)" label="Creator link" />
        <p class="text-sm text-muted-foreground">
          <template v-if="emailed">We also emailed it to you. </template>It brings you back as the
          creator on any device. You can copy it again anytime from the account menu.
        </p>
      </div>

      <Button as-child size="lg" class="w-full">
        <RouterLink :to="{ name: 'explorer', params: { pickupId: created.id } }">
          Open the pickup
          <ArrowRightIcon />
        </RouterLink>
      </Button>
    </section>

    <form
      v-else
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
