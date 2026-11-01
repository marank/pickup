<script setup lang="ts">
import { MailIcon } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { t } from '@/lib/i18n'

import { useRequestLink } from '../composables/usePickupAdmin'

const props = defineProps<{ pickupId: string }>()
const request = useRequestLink(() => props.pickupId)
const email = ref('')
const sent = ref('')

async function submit() {
  try {
    sent.value = (await request.mutateAsync(email.value.trim())).message
  } catch (err) {
    toast.error(apiErrorMessage(err, t('common.pleaseCheckTheAddress')))
  }
}
</script>

<template>
  <form class="space-y-2" @submit.prevent="submit">
    <p class="text-sm font-medium">{{ t('pickups.linkRequestForm.alreadyPartOfItOn') }}</p>
    <p class="text-sm text-muted-foreground">
      {{ t('pickups.linkRequestForm.enterTheAddressYouGave') }}
    </p>
    <div class="flex gap-2">
      <Input
        v-model="email"
        type="email"
        required
        placeholder="you@example.com"
        :aria-label="t('common.yourEmail')"
      />
      <Button type="submit" variant="secondary" :disabled="request.isPending.value">
        <MailIcon />
        {{ t('common.send') }}
      </Button>
    </div>
    <p v-if="sent" class="text-sm text-muted-foreground" role="status">{{ sent }}</p>
  </form>
</template>
