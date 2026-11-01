<script setup lang="ts">
import { UploadIcon } from '@lucide/vue'

import { t } from '@/lib/i18n'

import { useExplorer } from '../composables/useExplorer'

/** Upload on phones: a round button bottom right, above the upload list while it is shown. */
const explorer = useExplorer()
</script>

<template>
  <button
    v-if="explorer.uploadTarget && !explorer.page"
    type="button"
    class="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-tomato text-paper shadow-lg transition-[bottom,transform] duration-200 active:scale-95"
    :style="{
      bottom: 'calc(1rem + env(safe-area-inset-bottom) + var(--upload-tray-height, 0px))',
    }"
    :aria-label="t('Upload photos or videos')"
    @click="explorer.fileInput?.click()"
  >
    <UploadIcon class="size-6" />
  </button>
</template>
