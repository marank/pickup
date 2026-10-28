<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import type { Pickup } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useSetEmail } from '../composables/usePickupAdmin'

const props = defineProps<{ pickup: Pickup }>()
const open = defineModel<boolean>('open', { required: true })
const setEmail = useSetEmail(() => props.pickup.id)
const email = ref('')
watch(open, () => (email.value = ''))

async function submit() {
  try {
    await setEmail.mutateAsync(email.value.trim())
    toast.success('Check your inbox for your personal link')
    open.value = false
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not send the mail'))
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <form class="space-y-4" @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>Email me my personal link</DialogTitle>
          <DialogDescription>
            With your personal link you can log in on any device. We also save the address, so you
            can request the link again later.
            <template v-if="pickup.email_privacy">It is stored only as a hash.</template>
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-1.5">
          <Label for="own-email">Your email</Label>
          <Input id="own-email" v-model="email" type="email" required autocomplete="email" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">Cancel</Button>
          <Button type="submit" :disabled="setEmail.isPending.value">Send</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
