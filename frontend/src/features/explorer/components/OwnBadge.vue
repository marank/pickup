<script setup lang="ts">
import { t } from '@/lib/i18n'
</script>

<template>
  <!-- Next to the name of the signed-in member's own folder. -->
  <span
    class="shrink-0 rounded-full bg-tomato/12 px-1.5 py-px text-[0.65rem] leading-4 font-semibold tracking-wide text-tomato uppercase"
    :title="t('Your folder')"
  >
    {{ t('You') }}
  </span>
</template>
