<script setup lang="ts">
import { CheckIcon, CopyIcon } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const props = defineProps<{ value: string; label: string }>()

const copied = ref(false)

async function copyValue() {
  try {
    // Only in secure contexts (https, localhost); elsewhere the field can be selected by hand.
    await navigator.clipboard.writeText(props.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
    toast.success(`${props.label} copied`)
  } catch {
    toast.error(`Could not copy the ${props.label.toLowerCase()}`)
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
    <Button variant="outline" :aria-label="`Copy ${label.toLowerCase()}`" @click="copyValue">
      <CheckIcon v-if="copied" />
      <CopyIcon v-else />
    </Button>
  </div>
</template>
