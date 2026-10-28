<script setup lang="ts">
import { LockIcon } from '@lucide/vue'
import { computed } from 'vue'

import type { Pickup } from '@/api/types'
import { Separator } from '@/components/ui/separator'

import JoinForm from './JoinForm.vue'
import LinkRequestForm from './LinkRequestForm.vue'

const props = defineProps<{ pickup: Pickup; invalidLink?: boolean }>()

/** Signed in without a folder yet: the creator, or someone who was invited. */
const claiming = computed(() => props.pickup.is_member && !props.pickup.has_folder)
/** Closed by the creator: nobody else looks, uploads or joins. */
const closed = computed(() => props.pickup.visibility === 'creator')
const canJoin = computed(
  () => !closed.value && (claiming.value || props.pickup.join_policy === 'open'),
)
const initialName = computed(() =>
  claiming.value && props.pickup.member_name !== 'Creator' ? props.pickup.member_name : '',
)
const title = computed(() => props.pickup.title || 'this pickup')
</script>

<template>
  <div class="mx-auto max-w-md space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
    <div class="space-y-2">
      <p
        v-if="!pickup.can_view"
        class="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
      >
        <LockIcon class="size-3.5" />
        {{
          closed
            ? 'Closed'
            : pickup.password_required
              ? 'Protected with a password'
              : 'Private pickup'
        }}
      </p>
      <h1 class="text-2xl font-bold">
        {{ !canJoin ? title : claiming ? 'Choose your name' : `Join ${title}` }}
      </h1>
      <p v-if="invalidLink" class="text-sm text-destructive">
        That personal link is not valid. Join below, or ask for a new link.
      </p>
      <p class="text-muted-foreground">
        <template v-if="closed"
          >The creator has closed this pickup. Nobody can look at or add photos right now.</template
        >
        <template v-else-if="claiming"
          >Your folder gets this name; everyone in “{{ title }}” sees it.</template
        >
        <template v-else-if="canJoin">
          You get your own folder for uploads and can see everyone else's photos.
        </template>
        <template v-else-if="pickup.join_policy === 'invite'">
          Only invited people can take part. If you were invited, use the link from your invitation.
        </template>
        <template v-else>This pickup doesn't take new participants anymore.</template>
      </p>
    </div>
    <JoinForm
      v-if="canJoin"
      :pickup-id="pickup.id"
      :initial-name="initialName"
      :password-required="pickup.password_required"
    />
    <template v-if="!pickup.is_member && !closed">
      <Separator />
      <LinkRequestForm :pickup-id="pickup.id" />
    </template>
  </div>
</template>
