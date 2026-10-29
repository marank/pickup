<script setup lang="ts">
import { Loader2Icon } from '@lucide/vue'
import { ref, watch } from 'vue'

import { apiErrorMessage } from '@/api/errors'
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

import { checkCreationCode } from '../composables/useCreation'

/** Asks for a creation code (PICKUP_CREATION=code); emits it once the server accepted it. */
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ accepted: [code: string]; cancel: [] }>()
const code = ref('')
const error = ref('')
const checking = ref(false)
/** A code, not a login: no suggestions, autocorrect or password managers filling it in. */
const noAutofill = {
  autocomplete: 'off',
  autocorrect: 'off',
  autocapitalize: 'characters',
  spellcheck: 'false',
  'data-1p-ignore': '',
  'data-lpignore': 'true',
  'data-bwignore': '',
  'data-form-type': 'other',
}
const accepted = ref(false)
watch(open, (isOpen) => {
  if (!isOpen) return
  code.value = ''
  error.value = ''
  accepted.value = false
})

async function submit() {
  error.value = ''
  checking.value = true
  try {
    await checkCreationCode(code.value.trim())
    accepted.value = true
    emit('accepted', code.value.trim())
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not check the code')
  } finally {
    checking.value = false
  }
}

/** Closing without a code (Escape, the x, Cancel) counts as cancelling. */
function onOpenChange(isOpen: boolean) {
  if (!isOpen && !checking.value && !accepted.value) emit('cancel')
}
</script>

<template>
  <Dialog v-model:open="open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-md">
      <form class="space-y-4" @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>Enter your code</DialogTitle>
          <DialogDescription>
            You need a code to create a pickup on this server.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-1.5">
          <Label for="creation-code">Code</Label>
          <Input
            id="creation-code"
            v-model="code"
            required
            placeholder="1234-5678-9012"
            v-bind="noAutofill"
            :aria-invalid="error ? true : undefined"
          />
          <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('cancel')">Cancel</Button>
          <Button type="submit" :disabled="checking" class="min-w-24">
            <Loader2Icon v-if="checking" class="animate-spin" />
            <template v-else>Continue</template>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
