<script setup lang="ts">
import { LockIcon } from '@lucide/vue'
import { computed } from 'vue'

import type { Pickup } from '@/api/types'
import { Separator } from '@/components/ui/separator'
import { t } from '@/lib/i18n'

import JoinForm from './JoinForm.vue'
import LinkRequestForm from './LinkRequestForm.vue'

const props = defineProps<{ pickup: Pickup; invalidLink?: boolean }>()

/** Signed in without a folder yet: the creator, or someone who was invited. */
const claiming = computed(() => props.pickup.is_member && !props.pickup.has_folder)
/** Closed by the creator: nobody else looks, uploads or joins. */
const closed = computed(() => props.pickup.visibility === 'creator')
const canJoin = computed(
  () =>
    !closed.value &&
    !props.pickup.is_read_only &&
    (claiming.value || props.pickup.join_policy === 'open'),
)
const initialName = computed(() =>
  claiming.value && props.pickup.member_name !== 'Creator' ? props.pickup.member_name : '',
)
const title = computed(() => props.pickup.title || t('pickups.joinPanel.thisPickup'))
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
            ? t('pickups.joinPanel.closed')
            : pickup.password_required
              ? t('pickups.joinPanel.protectedWithAPassword')
              : t('pickups.joinPanel.privatePickup')
        }}
      </p>
      <h1 class="text-2xl font-bold">
        {{
          !canJoin
            ? title
            : claiming
              ? t('pickups.joinPanel.chooseYourName')
              : t('pickups.joinPanel.joinTitle', { title })
        }}
      </h1>
      <p v-if="invalidLink" class="text-sm text-destructive">
        {{ t('pickups.joinPanel.thatPersonalLinkIsNot') }}
      </p>
      <p class="text-muted-foreground">
        <template v-if="closed">{{ t('pickups.joinPanel.theCreatorHasClosedThis') }}</template>
        <template v-else-if="claiming">{{
          t('pickups.joinPanel.yourFolderGetsThisName', { title })
        }}</template>
        <template v-else-if="canJoin">
          {{ t('pickups.joinPanel.youGetYourOwnFolder') }}
        </template>
        <template v-else-if="pickup.is_read_only">
          {{ t('pickups.joinPanel.thisPickupIsReadOnly') }}
        </template>
        <template v-else-if="pickup.join_policy === 'invite'">
          {{ t('pickups.joinPanel.onlyInvitedPeopleCanTake') }}
        </template>
        <template v-else>{{ t('pickups.joinPanel.thisPickupDoesntTakeNew') }}</template>
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
