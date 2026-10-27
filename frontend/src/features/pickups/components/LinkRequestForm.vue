<script setup lang="ts">
import { MailIcon } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { useRequestLink } from '../composables/usePickupAdmin'

const props = defineProps<{ pickupId: string }>()
const request = useRequestLink(() => props.pickupId)
const email = ref('')
const sent = ref('')

async function submit() {
  try {
    sent.value = (await request.mutateAsync(email.value.trim())).message
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Please check the address'))
  }
}
</script>

<template>
  <form class="space-y-2" @submit.prevent="submit">
    <p class="text-sm font-medium">Already part of it on another device?</p>
    <p class="text-sm text-muted-foreground">
      Enter the address you gave when you joined or were invited, and we email you your personal
      link.
    </p>
    <div class="flex gap-2">
      <Input
        v-model="email"
        type="email"
        required
        placeholder="you@example.com"
        aria-label="Your email"
      />
      <Button type="submit" variant="secondary" :disabled="request.isPending.value">
        <MailIcon />
        Send
      </Button>
    </div>
    <p v-if="sent" class="text-sm text-muted-foreground" role="status">{{ sent }}</p>
  </form>
</template>
