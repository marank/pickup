<script setup lang="ts">
import { MonitorIcon, MoonIcon, SunIcon } from '@lucide/vue'
import { computed } from 'vue'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { t } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

import LanguageOptions from './LanguageOptions.vue'
import ThemeOptions from './ThemeOptions.vue'

const theme = useTheme()
const icon = computed(() => ({ system: MonitorIcon, light: SunIcon, dark: MoonIcon })[theme.value])
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" :aria-label="t('Colour scheme')">
        <component :is="icon" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-44">
      <DropdownMenuLabel>{{ t('Appearance') }}</DropdownMenuLabel>
      <DropdownMenuRadioGroup v-model="theme">
        <ThemeOptions />
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <LanguageOptions />
    </DropdownMenuContent>
  </DropdownMenu>
</template>
