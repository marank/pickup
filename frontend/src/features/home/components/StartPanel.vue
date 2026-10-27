<script setup lang="ts">
import { ArrowRightIcon, ChevronDownIcon, LinkIcon, PlusIcon } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import type { CreatedPickup } from '@/api/types'
import CopyField from '@/components/CopyField.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreatePickup } from '@/features/pickups/composables/usePickup'

const router = useRouter()
const createPickup = useCreatePickup()
const created = ref<CreatedPickup | null>(null)
const link = ref('')
const moreOpen = ref(false)
const creatorName = ref('')
const creatorEmail = ref('')
const absolute = (path: string) => `${window.location.origin}${path}`

async function create() {
  try {
    created.value = await createPickup.mutateAsync({
      creator_name: creatorName.value.trim(),
      creator_email: creatorEmail.value.trim(),
    })
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not create the pickup'))
  }
}

/** Accepts the pickup code or a whole share link. */
function pickupIdFrom(value: string): string {
  const match = value.match(/\/pickup\/([^/?#]+)/)
  return (match?.[1] ?? value).trim()
}

function openLink() {
  const pickupId = pickupIdFrom(link.value)
  if (pickupId) router.push({ name: 'explorer', params: { pickupId } })
}
</script>

<template>
  <div
    v-if="created"
    class="tag-hole space-y-4 rounded-2xl rounded-l-[2rem] border bg-card p-5 pl-9 shadow-sm"
  >
    <div>
      <p class="font-heading text-xl font-semibold">Your pickup is ready.</p>
      <p class="text-sm text-muted-foreground">Two links, two jobs:</p>
    </div>
    <div class="space-y-1.5">
      <p class="text-sm font-medium">
        Your creator link
        <span class="font-normal text-muted-foreground"
          >— keep it, it brings you back as the creator</span
        >
      </p>
      <CopyField :value="absolute(created.member_url)" label="Creator link" />
    </div>
    <div class="space-y-1.5">
      <p class="text-sm font-medium">
        Share link
        <span class="font-normal text-muted-foreground">— send this to everyone else</span>
      </p>
      <CopyField :value="absolute(created.share_url)" label="Share link" />
    </div>
    <Button as-child size="lg">
      <RouterLink :to="{ name: 'explorer', params: { pickupId: created.id } }">
        Open the pickup
        <ArrowRightIcon />
      </RouterLink>
    </Button>
  </div>

  <div v-else class="space-y-4">
    <form class="max-w-md space-y-3" @submit.prevent="create">
      <Button
        type="submit"
        size="lg"
        class="h-12 px-5 text-base"
        :disabled="createPickup.isPending.value"
      >
        <PlusIcon />
        {{ createPickup.isPending.value ? 'Creating…' : 'Start a pickup' }}
      </Button>
      <button
        type="button"
        class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        :aria-expanded="moreOpen"
        @click="moreOpen = !moreOpen"
      >
        Add your name and email (optional)
        <ChevronDownIcon class="size-3.5 transition-transform" :class="moreOpen && 'rotate-180'" />
      </button>
      <div v-if="moreOpen" class="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="creator-name">Your name</Label>
          <Input id="creator-name" v-model="creatorName" autocomplete="name" />
        </div>
        <div class="space-y-1.5">
          <Label for="creator-email">Your email</Label>
          <Input id="creator-email" v-model="creatorEmail" type="email" autocomplete="email" />
        </div>
        <p class="text-xs text-muted-foreground sm:col-span-2">
          With your name you get your own folder right away, and invitations show it. With an email
          we send you your creator link, so you can always get back in.
        </p>
      </div>
    </form>
    <form class="flex max-w-md gap-2" @submit.prevent="openLink">
      <label class="relative flex-1">
        <LinkIcon
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          v-model="link"
          placeholder="Got a link? Paste it here"
          aria-label="Share link"
          class="h-10 w-full rounded-lg border bg-card pr-3 pl-9 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring/40"
        />
      </label>
      <Button type="submit" variant="secondary" class="h-10" :disabled="!link.trim()">Open</Button>
    </form>
  </div>
</template>
