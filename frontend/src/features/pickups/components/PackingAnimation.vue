<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

/**
 * Shown while a pickup is created: three photos drop onto the truck (the "truck with a
 * stack of photos" design), then it drives off to the right. Plays once, about 2 s.
 */
const messages = ['Creating folders', 'Creating links', 'Almost done']
const message = ref(0)
const timer = window.setInterval(
  () => (message.value = Math.min(message.value + 1, messages.length - 1)),
  650,
)
onBeforeUnmount(() => window.clearInterval(timer))

/** The stack as in the design: each photo's rotation, rectangle and fill. */
const photos = [
  { angle: -16, x: 8, y: 10, width: 24, height: 28, fill: 'var(--foreground)' },
  { angle: 10, x: 11, y: 10, width: 24, height: 28, fill: 'var(--sage)' },
  { angle: -3, x: 9.5, y: 9, width: 25, height: 29, fill: 'var(--butter)' },
]
</script>

<template>
  <div class="flex flex-col items-center gap-6 pt-12 pb-6 text-center" role="status">
    <div class="relative w-full" aria-hidden="true">
      <svg viewBox="0 0 64 64" class="truck mx-auto block w-36 overflow-visible">
        <!-- Speed lines, trailing once the truck drives off. -->
        <g class="speed" stroke="var(--muted-foreground)" stroke-width="2" stroke-linecap="round">
          <path d="M-4 30 h-10 M-2 38 h-14 M-4 46 h-8" />
        </g>
        <g class="load">
          <!-- Photos behind the body, so they sit inside the cargo area. -->
          <g
            v-for="(photo, index) in photos"
            :key="index"
            class="photo"
            :style="{ animationDelay: `${index * 0.22}s` }"
          >
            <g :transform="`rotate(${photo.angle} 22 40)`">
              <rect
                :x="photo.x"
                :y="photo.y"
                :width="photo.width"
                :height="photo.height"
                rx="3"
                :fill="photo.fill"
              />
              <template v-if="index === photos.length - 1">
                <path
                  d="M13 31 L19.48 21.38 L23.8 26.19 L26.5 23.6 L31 31Z"
                  fill="var(--ink)"
                  stroke="var(--ink)"
                  stroke-width="1"
                  stroke-linejoin="round"
                />
                <circle cx="27.22" cy="16.32" r="2.34" fill="var(--ink)" />
              </template>
            </g>
          </g>
          <path
            d="M3 39 q0-3 3-3 H36 V24 q0-4 4-4 H49 q2.3 0 3.4 1.9 L58.6 32 q1.4 2.3 1.4 5 V46 q0 4-4 4 H7 q-4 0-4-4z"
            fill="var(--tomato)"
          />
          <path d="M40.5 24 h7.8 l4.6 8 h-12.4z" fill="var(--card)" />
        </g>
        <g v-for="x in [17, 47]" :key="x">
          <circle
            :cx="x"
            cy="50"
            r="7"
            fill="var(--foreground)"
            stroke="var(--card)"
            stroke-width="3"
          />
          <circle :cx="x" cy="50" r="2.4" fill="var(--card)" />
        </g>
      </svg>
      <!-- The road. -->
      <div class="mx-auto -mt-3 h-px w-3/4 bg-border" />
    </div>
    <div class="space-y-1">
      <p class="font-heading text-xl font-semibold">Creating your pickup…</p>
      <Transition name="message" mode="out-in">
        <p :key="message" class="text-sm text-muted-foreground">{{ messages[message] }}</p>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* Timeline: photos drop 0–0.9 s, the truck settles, then drives off 1.15–1.95 s. */
.photo {
  animation: drop 0.42s cubic-bezier(0.55, 0, 0.75, 0.4) both;
}
@keyframes drop {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  15% {
    opacity: 1;
  }
  80% {
    transform: translateY(1.5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.load {
  animation: settle 0.3s ease-out 0.92s both;
}
@keyframes settle {
  50% {
    transform: translateY(1.5px);
  }
}

.truck {
  animation: drive 0.8s cubic-bezier(0.5, 0, 0.8, 0.3) 1.15s both;
}
@keyframes drive {
  20% {
    transform: translateX(-6px);
  }
  to {
    transform: translateX(32rem);
  }
}

.speed {
  opacity: 0;
  animation: speed 0.8s ease-out 1.25s both;
}
@keyframes speed {
  30%,
  to {
    opacity: 1;
  }
}

.message-enter-active,
.message-leave-active {
  transition:
    opacity 0.2s,
    translate 0.2s;
}
.message-enter-from {
  opacity: 0;
  translate: 0 6px;
}
.message-leave-to {
  opacity: 0;
  translate: 0 -6px;
}

/* Without motion: the loaded truck just stands there. */
@media (prefers-reduced-motion: reduce) {
  .photo,
  .load,
  .truck,
  .speed {
    animation: none;
  }
  .speed {
    opacity: 0;
  }
}
</style>
