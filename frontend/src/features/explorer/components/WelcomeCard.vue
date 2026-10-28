<script setup lang="ts">
import { PartyPopperIcon, QrCodeIcon, XIcon } from '@lucide/vue'
import { computed } from 'vue'

import CopyField from '@/components/CopyField.vue'
import { Button } from '@/components/ui/button'
import { usePersonalLink } from '@/features/pickups/composables/usePickup'

import { useExplorer } from '../composables/useExplorer'

const emit = defineEmits<{ dismiss: [] }>()
const explorer = useExplorer()
const link = usePersonalLink(
  () => explorer.pickupId,
  () => explorer.pickup.data?.is_member ?? false,
)
const absolute = (path: string) => `${window.location.origin}${path}`
const shareUrl = computed(() => absolute(`/pickup/${explorer.pickupId}`))
</script>

<template>
  <section
    class="relative grid gap-4 rounded-xl border border-butter bg-butter/15 p-4 pr-12 md:grid-cols-2"
    aria-label="Your pickup is ready"
  >
    <Button
      variant="ghost"
      size="icon-sm"
      class="absolute top-2 right-2"
      aria-label="Dismiss"
      @click="emit('dismiss')"
    >
      <XIcon />
    </Button>
    <div class="space-y-2">
      <p class="flex items-center gap-2 font-heading text-lg font-semibold">
        <PartyPopperIcon class="size-5 text-tomato" />
        Your pickup is ready
      </p>
      <p class="text-sm text-muted-foreground">
        Send this link to everyone who should add photos, or show the QR card at the party.
      </p>
      <div class="flex gap-2">
        <CopyField :value="shareUrl" label="Share link" class="flex-1" />
        <Button variant="outline" @click="explorer.dialog = { kind: 'share' }">
          <QrCodeIcon />
          <span class="max-sm:hidden">QR card</span>
        </Button>
      </div>
    </div>
    <div class="space-y-2">
      <p class="font-medium">Your creator link</p>
      <p class="text-sm text-muted-foreground">
        <template v-if="link.data.value?.has_email">We also emailed it to you. </template>
        It brings you back as the creator on any device. You can copy it again anytime from the
        account menu.
      </p>
      <CopyField
        v-if="link.data.value"
        :value="absolute(link.data.value.member_url)"
        label="Creator link"
      />
    </div>
  </section>
</template>
