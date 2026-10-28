<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

/** Shown while a pickup is created: photos drop into a folder, the tag swings. */
const messages = ['Making room for photos', 'Tying the tag', 'Writing the links']
const message = ref(0)
const timer = window.setInterval(
  () => (message.value = Math.min(message.value + 1, messages.length - 1)),
  550,
)
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <div class="flex flex-col items-center gap-6 py-6 text-center" role="status">
    <div class="relative h-36 w-48" aria-hidden="true">
      <!-- Photos, one after another, falling into the folder. -->
      <span
        v-for="(color, index) in ['var(--owner-2)', 'var(--owner-3)', 'var(--owner-5)']"
        :key="color"
        class="photo absolute left-1/2 size-10 rounded-md border-2 border-card shadow-sm"
        :style="{
          background: color,
          animationDelay: `${index * 0.35}s`,
          '--x': `${(index - 1) * 22}px`,
          '--r': `${(index - 1) * 12}deg`,
        }"
      />
      <!-- The folder (back, then front, so photos disappear inside it). -->
      <span class="absolute bottom-2 left-1/2 h-16 w-36 -translate-x-1/2 rounded-lg bg-tomato/70" />
      <span
        class="absolute bottom-[4.5rem] left-[calc(50%-4.5rem)] h-4 w-14 rounded-t-md bg-tomato/70"
      />
      <span class="absolute bottom-2 left-1/2 h-12 w-36 -translate-x-1/2 rounded-lg bg-tomato" />
      <!-- The tag on its string. -->
      <svg viewBox="0 0 40 28" class="tag absolute right-1 bottom-6 w-12">
        <path
          d="M12 3 h22 a4 4 0 0 1 4 4 v14 a4 4 0 0 1 -4 4 h-22 l-8 -11 z"
          fill="var(--butter)"
        />
        <circle cx="12.5" cy="14" r="2.6" fill="var(--card)" />
        <path
          d="M20 11 h12 M20 17 h8"
          stroke="var(--ink)"
          stroke-width="2.2"
          stroke-linecap="round"
        />
      </svg>
    </div>
    <div class="space-y-1">
      <p class="font-heading text-xl font-semibold">Packing your pickup…</p>
      <Transition name="message" mode="out-in">
        <p :key="message" class="text-sm text-muted-foreground">{{ messages[message] }}</p>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.photo {
  top: 0;
  opacity: 0;
  translate: calc(-50% + var(--x)) 0;
  animation: drop 1.2s cubic-bezier(0.5, 0, 0.6, 1) infinite;
}

@keyframes drop {
  0% {
    opacity: 0;
    transform: translateY(-12px) rotate(calc(var(--r) * -1));
  }
  20% {
    opacity: 1;
  }
  70% {
    opacity: 1;
    transform: translateY(70px) rotate(var(--r));
  }
  100% {
    opacity: 0;
    transform: translateY(84px) rotate(var(--r));
  }
}

.tag {
  transform-origin: 10% 50%;
  animation: swing 1.4s ease-in-out infinite alternate;
}

@keyframes swing {
  from {
    transform: rotate(-14deg);
  }
  to {
    transform: rotate(10deg);
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

@media (prefers-reduced-motion: reduce) {
  .photo,
  .tag {
    animation: none;
  }
}
</style>
