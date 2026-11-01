<script setup lang="ts">
import { CheckIcon, CopyIcon } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { locale, t } from '@/lib/i18n'

const props = defineProps<{ value: string; label: string }>()

const copied = ref(false)

/** The label inside a sentence: lower case in English; German nouns keep their capital. */
const inSentence = (label: string) => (locale.value === 'de' ? label : label.toLowerCase())

async function copyValue() {
  try {
    // Only in secure contexts (https, localhost); elsewhere the field can be selected by hand.
    await navigator.clipboard.writeText(props.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
    toast.success(t('{label} copied', { label: props.label }))
  } catch {
    toast.error(t('Could not copy the {label}', { label: inSentence(props.label) }))
  }
}

function selectAll(event: FocusEvent) {
  ;(event.target as HTMLInputElement).select()
}
</script>

<template>
  <div class="flex gap-2">
    <Input
      :model-value="value"
      readonly
      :aria-label="label"
      class="font-mono text-xs"
      @focus="selectAll"
    />
    <Button
      variant="outline"
      :aria-label="t('Copy {label}', { label: inSentence(label) })"
      @click="copyValue"
    >
      <CheckIcon v-if="copied" />
      <CopyIcon v-else />
    </Button>
  </div>
</template>
