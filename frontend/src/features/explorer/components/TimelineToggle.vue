<script setup lang="ts">
import { ImagesIcon } from '@lucide/vue'
import { computed } from 'vue'

import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'

import { useExplorer } from '../composables/useExplorer'

/** Between the folders and the timeline; on phones only the icon. */
defineProps<{ compact?: boolean }>()
const explorer = useExplorer()
const on = computed(() => explorer.page === 'timeline')

function toggle() {
  if (on.value) explorer.navigate(null)
  else explorer.openPage('timeline')
}
</script>

<template>
  <Button
    v-if="explorer.canView"
    :variant="on ? 'secondary' : 'ghost'"
    :size="compact ? 'icon-sm' : 'sm'"
    :aria-pressed="on"
    :title="
      on
        ? t('explorer.timelineToggle.backToTheFolders')
        : t('explorer.timelineToggle.allPhotosByTheTime')
    "
    @click="toggle"
  >
    <ImagesIcon :class="!on && 'text-tomato'" />
    <span :class="compact && 'sr-only'">{{ t('common.timeline') }}</span>
  </Button>
</template>
