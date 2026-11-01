<script setup lang="ts">
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { t, useLanguage } from '@/lib/i18n'

const language = useLanguage()
// Each language in its own words, so it can be found whatever is shown right now.
const options = [
  { value: 'auto', label: () => t('Like the browser') },
  { value: 'en', label: () => 'English' },
  { value: 'de', label: () => 'Deutsch' },
]
</script>

<template>
  <DropdownMenuLabel class="text-xs text-muted-foreground">{{ t('Language') }}</DropdownMenuLabel>
  <DropdownMenuRadioGroup v-model="language">
    <DropdownMenuRadioItem v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label() }}
    </DropdownMenuRadioItem>
  </DropdownMenuRadioGroup>
</template>
