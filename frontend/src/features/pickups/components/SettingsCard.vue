<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'

/**
 * One group of the settings page: heading and explanation on the left (above when the page
 * is narrow; SettingsPanel is the container), the fields on the right. With `saveable` it is a
 * form of its own with a save bar.
 */
withDefaults(
  defineProps<{
    title: string
    description?: string
    saveable?: boolean
    dirty?: boolean
    pending?: boolean
    danger?: boolean
  }>(),
  { description: '', saveable: false, dirty: false, pending: false, danger: false },
)
const emit = defineEmits<{ save: []; discard: [] }>()
</script>

<template>
  <component
    :is="saveable ? 'form' : 'section'"
    class="rounded-xl border bg-card"
    :class="danger && 'border-destructive/40'"
    :aria-label="title"
    @submit.prevent="emit('save')"
  >
    <div class="grid gap-x-8 gap-y-4 p-5 @2xl:grid-cols-[13rem_1fr]">
      <div>
        <h3 class="font-medium" :class="danger && 'text-destructive'">{{ title }}</h3>
        <p v-if="description" class="mt-1 text-sm text-muted-foreground">{{ description }}</p>
      </div>
      <div class="min-w-0 space-y-4">
        <slot />
      </div>
    </div>
    <div v-if="saveable" class="flex justify-end gap-2 border-t px-5 py-3">
      <Button v-if="dirty" type="button" variant="ghost" @click="emit('discard')">{{
        t('pickups.settingsCard.discard')
      }}</Button>
      <Button type="submit" :disabled="!dirty || pending">{{ t('common.save') }}</Button>
    </div>
  </component>
</template>
