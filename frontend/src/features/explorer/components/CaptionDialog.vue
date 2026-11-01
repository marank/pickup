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
import { Textarea } from '@/components/ui/textarea'
import { t } from '@/lib/i18n'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    caption?: string
    confirmLabel: string
    cancelLabel?: string
    /** Object URL of a local file, shown above the caption field. */
    previewUrl?: string
    previewIsImage?: boolean
    pending?: boolean
  }>(),
  { description: '', caption: '', cancelLabel: '', previewUrl: '', previewIsImage: true },
)
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [caption: string]; cancel: [] }>()

const text = ref(props.caption)
watch(open, (isOpen) => {
  if (isOpen) text.value = props.caption
})

function cancel() {
  emit('cancel')
  open.value = false
}
</script>

<template>
  <Dialog :open="open" @update:open="(value) => (value ? (open = true) : cancel())">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">{{ description }}</DialogDescription>
      </DialogHeader>
      <template v-if="previewUrl">
        <img
          v-if="previewIsImage"
          :src="previewUrl"
          alt=""
          class="max-h-60 w-full rounded-md object-contain"
        />
        <video v-else :src="previewUrl" controls preload="metadata" class="max-h-60 w-full" />
      </template>
      <Textarea
        v-model="text"
        :placeholder="t('explorer.captionDialog.addACaption')"
        rows="3"
        :aria-label="t('common.caption')"
      />
      <DialogFooter>
        <Button variant="outline" @click="cancel">{{ cancelLabel || t('common.cancel') }}</Button>
        <Button :disabled="pending" @click="emit('confirm', text.trim())">{{
          confirmLabel
        }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
