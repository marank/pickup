<script setup lang="ts">
import { MonitorIcon, MoonIcon, SunIcon } from '@lucide/vue'

import { DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'

const options = [
  { value: 'system', label: 'System', icon: MonitorIcon },
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
]
</script>

<template>
  <DropdownMenuRadioItem v-for="option in options" :key="option.value" :value="option.value">
    <component :is="option.icon" />
    {{ option.label }}
  </DropdownMenuRadioItem>
</template>
