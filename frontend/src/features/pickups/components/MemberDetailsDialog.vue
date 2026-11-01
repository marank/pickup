<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { computed, reactive, ref, watch } from 'vue'
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

import { personalLinkQuery, useUpdateMember } from '../composables/usePickup'
import { useSetEmail } from '../composables/usePickupAdmin'

/** The signed-in member's own name, their folder's name and their address. */
const props = defineProps<{ pickup: Pickup; folderName: string | null }>()
const open = defineModel<boolean>('open', { required: true })

const update = useUpdateMember(() => props.pickup.id)
const setEmail = useSetEmail(() => props.pickup.id)
const link = useQuery({
  ...personalLinkQuery(props.pickup.id),
  enabled: computed(() => open.value),
})
const hasEmail = computed(() => link.data.value?.has_email ?? false)
const form = reactive({ name: '', folder: '', email: '' })
const saving = ref(false)

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    form.name = props.pickup.member_name ?? ''
    form.folder = props.folderName ?? ''
    form.email = ''
  },
  { immediate: true },
)

async function submit() {
  const details: { user_name?: string; folder_name?: string } = {}
  if (form.name.trim() !== (props.pickup.member_name ?? '')) details.user_name = form.name.trim()
  if (props.folderName !== null && form.folder.trim() !== props.folderName)
    details.folder_name = form.folder.trim()
  const email = form.email.trim()
  saving.value = true
  try {
    if (Object.keys(details).length) await update.mutateAsync(details)
    if (email) {
      const { message } = await setEmail.mutateAsync(email)
      toast.success(message)
    } else {
      toast.success(t('Saved'))
    }
    open.value = false
  } catch (err) {
    toast.error(apiErrorMessage(err, t('Could not save')))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <form class="space-y-4" @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>{{ t('Your details') }}</DialogTitle>
          <DialogDescription>{{
            t('Everyone in the pickup sees your name and folder.')
          }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-1.5">
          <Label for="details-name">{{ t('Your name') }}</Label>
          <Input
            id="details-name"
            v-model="form.name"
            required
            maxlength="100"
            autocomplete="name"
          />
        </div>
        <div v-if="folderName !== null" class="space-y-1.5">
          <Label for="details-folder">{{ t('Your folder') }}</Label>
          <Input id="details-folder" v-model="form.folder" required maxlength="100" />
        </div>
        <div class="space-y-1.5">
          <Label for="details-email">{{ t('Email') }}</Label>
          <Input
            id="details-email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            :placeholder="hasEmail ? t('Saved. Enter a new address to change it') : t('Optional')"
          />
          <p class="text-xs text-muted-foreground">
            <template v-if="hasEmail">
              {{
                t('A new address is only saved after you confirm it with the link we send to it.')
              }}
            </template>
            <template v-else>{{ t('We send you your personal link to this address.') }}</template>
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">{{ t('Cancel') }}</Button>
          <Button type="submit" :disabled="saving">{{ t('Save') }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
