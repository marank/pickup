<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import { CARD, cardFonts, drawQrCard } from '@/lib/qrCard'

const props = defineProps<{ value: string; title: string }>()
const canvas = ref<HTMLCanvasElement | null>(null)

/** Draw once the heading font is there, else the canvas would use a fallback font. */
async function fontsReady() {
  await Promise.all(cardFonts().map((font) => document.fonts?.load(font))).catch(() => {})
}

async function render(target: HTMLCanvasElement, scale: number): Promise<boolean> {
  await fontsReady()
  const context = target.getContext('2d')
  if (!context) return false
  // First pass measures the height (the name may take two lines), second draws.
  const height = drawQrCard(context, props.value, props.title, scale)
  target.width = CARD.width * scale
  target.height = height * scale
  drawQrCard(context, props.value, props.title, scale)
  return true
}

async function preview() {
  if (canvas.value) await render(canvas.value, Math.min(window.devicePixelRatio || 1, 2))
}
onMounted(preview)
watch(() => [props.value, props.title], preview)

/** The card as PNG in print quality (1800 px wide). */
async function toPng(): Promise<Blob | null> {
  const target = document.createElement('canvas')
  if (!(await render(target, 3))) return null
  return new Promise((resolve) => target.toBlob(resolve, 'image/png'))
}

defineExpose({ toPng })
</script>

<template>
  <canvas
    ref="canvas"
    role="img"
    :aria-label="`QR code card for “${title}”`"
    class="h-auto rounded-lg shadow-sm"
    :width="CARD.width"
    :height="CARD.width * 1.3"
  />
</template>
