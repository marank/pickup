<script setup lang="ts">
import { MonitorIcon, MoonIcon, SunIcon } from '@lucide/vue'

import { DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'
import { t } from '@/lib/i18n'

const options = [
  { value: 'system', label: () => t('System'), icon: MonitorIcon },
  { value: 'light', label: () => t('Light'), icon: SunIcon },
  { value: 'dark', label: () => t('Dark'), icon: MoonIcon },
]
</script>

<template>
  <DropdownMenuRadioItem v-for="option in options" :key="option.value" :value="option.value">
    <component :is="option.icon" />
    {{ option.label() }}
  </DropdownMenuRadioItem>
</template>
