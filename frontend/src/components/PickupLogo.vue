<script setup lang="ts">
import PickupMark from '@/components/PickupMark.vue'
import { WORDMARK, tileTransform } from '@/lib/brand'

const { dot } = WORDMARK
</script>

<template>
  <!-- The mark and the wordmark (lib/brand.ts): letters and frame in the text colour. -->
  <span class="inline-flex h-full items-center gap-2" role="img" aria-label="Pickup">
    <PickupMark class="h-full w-auto" />
    <svg
      :viewBox="`0 0 ${WORDMARK.width} ${WORDMARK.height}`"
      class="h-[62%] w-auto"
      aria-hidden="true"
    >
      <path :d="WORDMARK.d" fill="currentColor" />
      <rect
        :x="dot.x"
        :y="dot.y"
        :width="dot.size"
        :height="dot.size"
        :rx="dot.radius"
        :transform="tileTransform(dot)"
        fill="var(--tomato)"
      />
    </svg>
  </span>
</template>
