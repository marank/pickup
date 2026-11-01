<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { XIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'
import { t } from '@/lib/i18n'
import { DialogClose, DialogContent, DialogPortal, useForwardPropsEmits } from 'reka-ui'
import { Button } from '@/components/ui/button'
import DialogOverlay from './DialogOverlay.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<
    DialogContentProps & {
      class?: HTMLAttributes['class']
      showCloseButton?: boolean
      /** The whole screen (the media viewer): no centring, no height limit. */
      fullscreen?: boolean
    }
  >(),
  {
    showCloseButton: true,
    fullscreen: false,
  },
)
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, 'class', 'fullscreen')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<!-- Centred in the visible part of the page (lib/visibleViewport.ts), so on phones it moves
     up above the on-screen keyboard. Without those values: at the top on phones. -->
<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/10 grid gap-4 rounded-xl p-4 text-sm ring-1 duration-100 fixed z-50 outline-none',
          fullscreen
            ? 'inset-0'
            : 'max-w-[calc(100%-2rem)] sm:max-w-sm top-[max(1rem,env(safe-area-inset-top))] left-1/2 max-h-[calc(100dvh-2rem)] w-full -translate-x-1/2 overflow-y-auto sm:top-1/2 sm:-translate-y-1/2 [.vv_&]:top-[calc(var(--vv-top)+var(--vv-height)/2)] [.vv_&]:max-h-[calc(var(--vv-height)-2rem)] [.vv_&]:-translate-y-1/2',
          props.class,
        )
      "
    >
      <slot />

      <DialogClose v-if="showCloseButton" data-slot="dialog-close" as-child>
        <Button variant="ghost" class="absolute top-2 right-2" size="icon-sm">
          <XIcon />
          <span class="sr-only">{{ t('Close') }}</span>
        </Button>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
