<script setup lang="ts">
import { LockIcon } from '@lucide/vue'

import PeoplePanel from '@/features/pickups/components/PeoplePanel.vue'
import SettingsPanel from '@/features/pickups/components/SettingsPanel.vue'
import { t } from '@/lib/i18n'

import { useExplorer } from '../composables/useExplorer'
import TimelinePane from './TimelinePane.vue'

const explorer = useExplorer()
</script>

<template>
  <TimelinePane v-if="explorer.page === 'timeline'" />
  <main
    v-else
    class="min-w-0 flex-1 overflow-y-auto p-4 select-text sm:p-6"
    data-testid="page-pane"
  >
    <template v-if="explorer.pickup.data?.is_creator">
      <SettingsPanel v-if="explorer.page === 'settings'" :pickup="explorer.pickup.data" />
      <PeoplePanel v-else :pickup="explorer.pickup.data" />
    </template>
    <div
      v-else-if="explorer.pickup.data"
      class="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground"
    >
      <LockIcon class="size-6" />
      <p>{{ t('explorer.pagePane.onlyTheCreatorOfThis') }}</p>
    </div>
  </main>
</template>
