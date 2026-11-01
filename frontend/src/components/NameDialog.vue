<script setup lang="ts">
import { ref, watch } from 'vue'

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

const props = withDefaults(
  defineProps<{
    title: string
    label: string
    initial?: string
    confirmLabel: string
    description?: string
    pending?: boolean
    allowEmpty?: boolean
  }>(),
  { initial: '', description: '', pending: false, allowEmpty: false },
)
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [value: string] }>()

const value = ref(props.initial)
watch(open, (isOpen) => {
  if (isOpen) value.value = props.initial
})

function submit() {
  const trimmed = value.value.trim()
  if (trimmed || props.allowEmpty) emit('confirm', trimmed)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <form class="space-y-4" @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>{{ title }}</DialogTitle>
          <DialogDescription v-if="description">{{ description }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-1.5">
          <Label for="name-dialog-input">{{ label }}</Label>
          <Input
            id="name-dialog-input"
            v-model="value"
            maxlength="100"
            autofocus
            autocomplete="off"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">{{ t('Cancel') }}</Button>
          <Button type="submit" :disabled="pending || (!allowEmpty && !value.trim())">{{
            confirmLabel
          }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
