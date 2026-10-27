<script setup lang="ts">
import { encode } from 'uqr'
import { computed } from 'vue'

const props = defineProps<{ value: string; label: string }>()

const QUIET_ZONE = 2 // modules of white around the code, so cameras find its edges

/** The code as one SVG path of dark squares: crisp at any size, no HTML injected. */
const qr = computed(() => {
  const { data, size } = encode(props.value, { border: 0, ecc: 'M' })
  let path = ''
  data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`
    }),
  )
  return { data, size: size + 2 * QUIET_ZONE, path }
})

/** A PNG for printing or sending around; light background whatever the colour scheme. */
function toPng(pixelsPerModule = 16): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = qr.value.size * pixelsPerModule
  const context = canvas.getContext('2d')
  if (!context) return Promise.resolve(null)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#000000'
  qr.value.data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark)
        context.fillRect(
          (x + QUIET_ZONE) * pixelsPerModule,
          (y + QUIET_ZONE) * pixelsPerModule,
          pixelsPerModule,
          pixelsPerModule,
        )
    }),
  )
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

defineExpose({ toPng })
</script>

<template>
  <svg
    :viewBox="`0 0 ${qr.size} ${qr.size}`"
    role="img"
    :aria-label="label"
    shape-rendering="crispEdges"
    class="rounded-lg bg-white"
  >
    <path :d="qr.path" fill="#000" />
  </svg>
</template>
