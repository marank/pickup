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
import { t } from '@/lib/i18n'

import { useSetEmail } from '../composables/usePickupAdmin'

const props = defineProps<{ pickup: Pickup }>()
const open = defineModel<boolean>('open', { required: true })
const setEmail = useSetEmail(() => props.pickup.id)
const email = ref('')
watch(open, () => (email.value = ''))

async function submit() {
  try {
    const { message } = await setEmail.mutateAsync(email.value.trim())
    // A different address than the stored one only gets a confirmation link.
    toast.success(message || t('common.checkYourInboxForYour'))
    open.value = false
  } catch (err) {
    toast.error(apiErrorMessage(err, t('common.couldNotSendTheMail')))
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <form class="space-y-4" @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>{{ t('common.emailMeMyPersonalLink') }}</DialogTitle>
          <DialogDescription>
            {{ t('pickups.emailLinkDialog.withYourPersonalLinkYou') }}
            <template v-if="pickup.email_privacy">{{ t('common.itIsStoredOnlyAs') }}</template>
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-1.5">
          <Label for="own-email">{{ t('common.yourEmail') }}</Label>
          <Input id="own-email" v-model="email" type="email" required autocomplete="email" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">{{
            t('common.cancel')
          }}</Button>
          <Button type="submit" :disabled="setEmail.isPending.value">{{ t('common.send') }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
