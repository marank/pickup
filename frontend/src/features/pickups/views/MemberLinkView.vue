<script setup lang="ts">
import { ArrowRightIcon, Loader2Icon } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { api } from '@/api/client'
import { apiErrorMessage, unwrap } from '@/api/errors'
import { Button } from '@/components/ui/button'
import LogoIntro from '@/features/home/components/LogoIntro.vue'

import { enterPickup } from '../composables/usePickup'

/**
 * A personal link: the logo assembles in the middle, moves up, and a box says whose link it
 * is. Only the button logs this browser in (the key is not used before that).
 */
const props = defineProps<{ pickupId: string; accessKey: string }>()
const router = useRouter()

/** The logo intro (LogoIntro.vue) plus a short moment to look at it. */
const INTRO_MS = 1650
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const preview = ref<{ title: string; user_name: string; is_creator: boolean } | null>(null)
const entering = ref(false)
const title = computed(() => preview.value?.title || 'Untitled pickup')
/** A creator who gave no name is called "Creator". */
const name = computed(() =>
  preview.value?.is_creator && preview.value.user_name === 'Creator'
    ? 'the creator'
    : (preview.value?.user_name ?? ''),
)

onMounted(async () => {
  const [result] = await Promise.all([
    unwrap(
      api.POST('/api/pickups/{id}/session/preview/', {
        params: { path: { id: props.pickupId } },
        body: { access_key: props.accessKey },
      }),
    ).catch(() => null),
    pause(reducedMotion() ? 0 : INTRO_MS),
  ])
  if (!result) {
    await router.replace({
      name: 'pickup-join',
      params: { pickupId: props.pickupId },
      query: { invalidLink: '1' },
    })
    return
  }
  preview.value = result
})

async function enter() {
  entering.value = true
  try {
    await enterPickup(props.pickupId, props.accessKey)
    // The plain pickup URL replaces this one, so the key doesn't linger in the history.
    await router.replace({ name: 'explorer', params: { pickupId: props.pickupId } })
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not log in'))
    entering.value = false
  }
}
</script>

<template>
  <div class="flex min-h-svh flex-col items-center justify-center px-4 py-10">
    <LogoIntro />
    <!-- Grows from nothing, so the logo above glides up as the box comes in. -->
    <div
      class="grid w-full max-w-sm transition-[grid-template-rows] duration-500 ease-out motion-reduce:transition-none"
      :class="preview ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
    >
      <div class="overflow-hidden p-1">
        <section
          class="mt-10 rounded-2xl border bg-card p-6 text-center shadow-sm transition duration-500 motion-reduce:transition-none"
          :class="preview ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'"
          aria-label="Your personal link"
        >
          <p class="text-sm text-muted-foreground">Your personal link for</p>
          <h1 class="mt-1 font-heading text-2xl font-bold break-words">{{ title }}</h1>
          <p class="mt-4">
            You are <strong>{{ name }}</strong
            ><template v-if="preview?.is_creator && name !== 'the creator'">, the creator</template
            >.
          </p>
          <Button size="lg" class="mt-6 w-full" :disabled="entering || !preview" @click="enter">
            <Loader2Icon v-if="entering" class="animate-spin" />
            <template v-else>
              Log in
              <ArrowRightIcon />
            </template>
          </Button>
          <p class="mt-3 text-xs text-muted-foreground">This logs you in on this device.</p>
        </section>
      </div>
    </div>
  </div>
</template>
