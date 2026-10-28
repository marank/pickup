<script setup lang="ts">
import { MARK, tileTransform } from '@/lib/brand'

const { frame, tile } = MARK
</script>

<template>
  <!-- The logo's mark (lib/brand.ts): frame in the text colour, the lifted tile tomato. -->
  <svg :viewBox="`0 0 ${MARK.size} ${MARK.size}`" aria-hidden="true">
    <rect
      :x="frame.x"
      :y="frame.y"
      :width="frame.size"
      :height="frame.size"
      :rx="frame.radius"
      :transform="tileTransform(frame)"
      fill="none"
      stroke="currentColor"
      :stroke-width="frame.stroke"
    />
    <rect
      :x="tile.x"
      :y="tile.y"
      :width="tile.size"
      :height="tile.size"
      :rx="tile.radius"
      :transform="tileTransform(tile)"
      fill="var(--tomato)"
    />
  </svg>
</template>
