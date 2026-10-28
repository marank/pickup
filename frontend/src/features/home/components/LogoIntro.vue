<script setup lang="ts">
import { MARK, WORDMARK, tileTransform } from '@/lib/brand'

/**
 * The logo at the top of the start page, assembling itself once: the tomato tile starts a bit smaller
 * and upright in the middle of the frame, swings out to the lower left (the frame to the upper right),
 * then both move to their places in the logo.
 */
const { frame, tile } = MARK
const { dot } = WORDMARK
const centre = (t: { x: number; y: number; size: number }) => ({
  x: t.x + t.size / 2,
  y: t.y + t.size / 2,
})
// Where each part starts: both centred on the point between their final centres.
const middle = {
  x: (centre(frame).x + centre(tile).x) / 2,
  y: (centre(frame).y + centre(tile).y) / 2,
}
// The groups around the shapes move; the shapes keep their logo rotation as an attribute, so
// once the animation is over the mark is exactly PickupMark (no CSS transform left behind).
const offset = (t: typeof frame | typeof tile) => ({
  '--dx': `${middle.x - centre(t).x}px`,
  '--dy': `${middle.y - centre(t).y}px`,
  '--unrotate': `${-t.rotate}deg`,
  transformOrigin: `${centre(t).x}px ${centre(t).y}px`,
})
</script>

<template>
  <div class="flex justify-center">
    <span class="logo inline-flex h-16 items-center gap-3 sm:h-20" role="img" aria-label="Pickup">
      <svg :viewBox="`0 0 ${MARK.size} ${MARK.size}`" class="mark h-full w-auto" aria-hidden="true">
        <g class="frame" :style="offset(frame)">
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
        </g>
        <g class="tile" :style="offset(tile)">
          <rect
            :x="tile.x"
            :y="tile.y"
            :width="tile.size"
            :height="tile.size"
            :rx="tile.radius"
            :transform="tileTransform(tile)"
            fill="var(--tomato)"
          />
        </g>
      </svg>
      <svg
        :viewBox="`0 0 ${WORDMARK.width} ${WORDMARK.height}`"
        class="wordmark h-[62%] w-auto"
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
  </div>
</template>

<style scoped>
.frame,
.tile {
  transform-box: view-box;
}
/* Hold in the middle, swing apart (tile lower left, frame upper right), then settle with a slight overshoot. */
.tile {
  animation: tile 1.3s backwards;
}
.frame {
  animation: frame 1.3s backwards;
}
@keyframes tile {
  0%,
  25% {
    transform: translate(var(--dx), var(--dy)) rotate(var(--unrotate)) scale(0.68);
    animation-timing-function: ease-in-out;
  }
  48% {
    transform: translate(calc(var(--dx) - 5px), calc(var(--dy) + 4px)) rotate(var(--unrotate))
      scale(0.68);
    animation-timing-function: cubic-bezier(0.3, 1.35, 0.5, 1);
  }
  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }
}
@keyframes frame {
  0%,
  25% {
    transform: translate(var(--dx), var(--dy)) rotate(var(--unrotate)) scale(1);
    animation-timing-function: ease-in-out;
  }
  48% {
    transform: translate(calc(var(--dx) + 5px), calc(var(--dy) - 4px)) rotate(var(--unrotate))
      scale(1);
    animation-timing-function: cubic-bezier(0.3, 1.35, 0.5, 1);
  }
  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }
}
/* Alone, the mark starts in the middle; it makes room as the letters come in. */
.logo {
  --height: 4rem;
}
@media (width >= 40rem) {
  .logo {
    --height: 5rem;
  }
}
.mark {
  /* Half of the wordmark (62 % of the height, 2785 × 912) plus half the gap. */
  animation: make-room 0.55s cubic-bezier(0.3, 1, 0.5, 1) 0.7s backwards;
}
@keyframes make-room {
  from {
    translate: calc(var(--height) * 0.62 * 2785 / 912 / 2 + 0.375rem) 0;
  }
}
.wordmark {
  animation: wordmark 0.5s ease-out 0.75s backwards;
}
@keyframes wordmark {
  from {
    opacity: 0;
    translate: -8px 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .frame,
  .tile,
  .mark,
  .wordmark {
    animation: none;
  }
}
</style>
