<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import type { Member, Pickup } from '@/api/types'
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

import { usePickupAdmin } from '../composables/usePickupAdmin'

const props = defineProps<{ pickup: Pickup; member: Member | null }>()
const open = defineModel<boolean>('open', { required: true })
const admin = usePickupAdmin(() => props.pickup.id, false)
const email = ref('')
watch(open, () => (email.value = ''))

async function submit() {
  if (!props.member) return
  try {
    const { message } = await admin.addEmail.mutateAsync({
      memberId: props.member.id,
      email: email.value.trim(),
    })
    toast.success(message)
    open.value = false
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not save the address'))
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <form class="space-y-4" @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>Add an email for {{ member?.user_name }}</DialogTitle>
          <DialogDescription>
            They get their personal link at this address right away, and can have it sent there
            again whenever they lose it. Only they can change it later.
            <template v-if="pickup.email_privacy">It is stored only as a hash.</template>
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-1.5">
          <Label for="member-email">Their email</Label>
          <Input id="member-email" v-model="email" type="email" required autocomplete="off" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">Cancel</Button>
          <Button type="submit" :disabled="admin.addEmail.isPending.value">Save and send</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
