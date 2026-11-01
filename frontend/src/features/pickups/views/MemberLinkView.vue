<script setup lang="ts">
import { ArrowRightIcon, Loader2Icon } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { api } from '@/api/client'
import { apiErrorMessage, unwrap } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LogoIntro from '@/features/home/components/LogoIntro.vue'
import { t } from '@/lib/i18n'

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

const preview = ref<{
  title: string
  user_name: string
  is_creator: boolean
  password_required: boolean
} | null>(null)
const password = ref('')
const entering = ref(false)
const title = computed(() => preview.value?.title || t('common.untitledPickup'))
/** A creator who gave no name is called "Creator". */
const unnamedCreator = computed(
  () => preview.value?.is_creator === true && preview.value.user_name === 'Creator',
)
const name = computed(() =>
  unnamedCreator.value ? t('common.theCreator') : (preview.value?.user_name ?? ''),
)
/** The sentence around the name, which is set in bold. */
const youAre = computed(() =>
  (preview.value?.is_creator && !unnamedCreator.value
    ? t('pickups.memberLinkView.youAreNameTheCreator')
    : t('pickups.memberLinkView.youAreName')
  ).split('{name}'),
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
    await enterPickup(
      props.pickupId,
      props.accessKey,
      preview.value?.password_required ? password.value : undefined,
    )
    // The plain pickup URL replaces this one, so the key doesn't linger in the history.
    await router.replace({ name: 'explorer', params: { pickupId: props.pickupId } })
  } catch (err) {
    toast.error(apiErrorMessage(err, t('pickups.memberLinkView.couldNotLogIn')))
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
          :aria-label="t('common.yourPersonalLink')"
        >
          <p class="text-sm text-muted-foreground">
            {{ t('pickups.memberLinkView.yourPersonalLinkFor') }}
          </p>
          <h1 class="mt-1 font-heading text-2xl font-bold break-words">{{ title }}</h1>
          <p class="mt-4">
            {{ youAre[0] }}<strong>{{ name }}</strong
            >{{ youAre[1] }}
          </p>
          <form class="mt-6 space-y-3 text-left" @submit.prevent="enter">
            <div v-if="preview?.password_required" class="space-y-1.5">
              <Label for="link-password">{{ t('common.passwordOfThePickup') }}</Label>
              <Input
                id="link-password"
                v-model="password"
                type="password"
                required
                autocomplete="current-password"
              />
            </div>
            <Button type="submit" size="lg" class="w-full" :disabled="entering || !preview">
              <Loader2Icon v-if="entering" class="animate-spin" />
              <template v-else>
                {{ t('pickups.memberLinkView.logIn') }}
                <ArrowRightIcon />
              </template>
            </Button>
          </form>
          <p class="mt-3 text-xs text-muted-foreground">
            {{ t('pickups.memberLinkView.thisLogsYouInOn') }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
