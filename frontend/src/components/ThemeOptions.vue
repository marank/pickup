<script setup lang="ts">
import { MonitorIcon, MoonIcon, SunIcon } from '@lucide/vue'

import { DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'
import { t } from '@/lib/i18n'

const options = [
  { value: 'system', label: () => t('app.themeOptions.system'), icon: MonitorIcon },
  { value: 'light', label: () => t('app.themeOptions.light'), icon: SunIcon },
  { value: 'dark', label: () => t('app.themeOptions.dark'), icon: MoonIcon },
]
</script>

<template>
  <DropdownMenuRadioItem v-for="option in options" :key="option.value" :value="option.value">
    <component :is="option.icon" />
    {{ option.label() }}
  </DropdownMenuRadioItem>
</template>
