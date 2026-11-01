<script setup lang="ts">
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DownloadIcon,
  KeyRoundIcon,
  LinkIcon,
  MailIcon,
  UsersIcon,
} from '@lucide/vue'
import { useResizeObserver } from '@vueuse/core'
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { ApiError, apiErrorMessage } from '@/api/errors'
import type { CreatedPickup } from '@/api/types'
import CopyField from '@/components/CopyField.vue'
import QrCard from '@/components/QrCard.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { t } from '@/lib/i18n'

import CreationCodeDialog from '../components/CreationCodeDialog.vue'
import PackingAnimation from '../components/PackingAnimation.vue'
import { creationCode, useCreationMode } from '../composables/useCreation'
import { useCreatePickup } from '../composables/usePickup'

const createPickup = useCreatePickup()
const router = useRouter()

/** With PICKUP_CREATION=code the page needs an accepted code (from the start page's dialog,
 * or asked for here); cancelling goes back to the start page. */
const creation = useCreationMode()
const askCode = ref(false)
watch(
  () => creation.data.value?.mode,
  (mode) => {
    if (mode === 'code' && !creationCode.value) askCode.value = true
    if (mode === 'none') {
      toast.error(t('pickups.createView.creatingPickupsIsTurnedOff'))
      void router.replace({ name: 'home' })
    }
  },
  { immediate: true },
)
const cancelCode = () => router.push({ name: 'home' })
/** form → creating (a short animation, so it doesn't feel like nothing happened) → ready. */
const phase = ref<'form' | 'creating' | 'ready'>('form')
const PACKING_MS = 2000
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))
/** Step 2: the new pickup and whether the creator's personal link went out by mail. */
const created = ref<CreatedPickup | null>(null)
const emailed = ref(false)
const qr = ref<InstanceType<typeof QrCard> | null>(null)
/** Height of the current step's content; the card animates to it. */
const content = ref<HTMLElement | null>(null)
const contentHeight = ref<number | null>(null)
useResizeObserver(content, () => (contentHeight.value = content.value?.offsetHeight ?? null))
const absolute = (path: string) => `${window.location.origin}${path}`
const shareUrl = computed(() => (created.value ? absolute(`/pickup/${created.value.id}`) : ''))
const form = reactive({ title: '', creator_name: '', creator_email: '', join_policy: 'open' })
const fieldErrors = ref<Record<string, string>>({})
const steps = computed(() => [
  { label: t('common.details'), current: phase.value !== 'ready' },
  { label: t('pickups.createView.links'), current: phase.value === 'ready' },
])

const policies = [
  {
    value: 'open',
    icon: LinkIcon,
    label: () => t('common.anyoneWithTheLink'),
    hint: () => t('pickups.createView.everyoneWithTheLinkPicks'),
  },
  {
    value: 'invite',
    icon: MailIcon,
    label: () => t('pickups.createView.onlyPeopleIInvite'),
    hint: () => t('common.youInvitePeopleByEmail'),
  },
] as const

async function submit() {
  fieldErrors.value = {}
  phase.value = 'creating'
  window.scrollTo({ top: 0 })
  try {
    const [pickup] = await Promise.all([
      createPickup.mutateAsync({
        title: form.title.trim(),
        creator_name: form.creator_name.trim(),
        creator_email: form.creator_email.trim(),
        join_policy: form.join_policy as 'open' | 'invite',
        ...(creationCode.value && { code: creationCode.value }),
      }),
      pause(reducedMotion() ? 0 : PACKING_MS),
    ])
    created.value = pickup
    creationCode.value = '' // used up: the next pickup asks again
    emailed.value = Boolean(form.creator_email.trim())
    phase.value = 'ready'
  } catch (err) {
    phase.value = 'form'
    // The code stopped working meanwhile (changed on the server): ask again.
    if (err instanceof ApiError && err.status === 403 && creation.data.value?.mode === 'code') {
      creationCode.value = ''
      askCode.value = true
    }
    if (err instanceof ApiError && err.body && typeof err.body === 'object') {
      for (const [field, messages] of Object.entries(err.body)) {
        if (Array.isArray(messages)) fieldErrors.value[field] = String(messages[0])
      }
    }
    toast.error(apiErrorMessage(err, t('pickups.createView.couldNotCreateThePickup')))
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl py-4 sm:py-8">
    <div class="mb-4 flex items-center gap-3 text-sm">
      <RouterLink
        v-if="phase === 'form'"
        :to="{ name: 'home' }"
        class="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon class="size-4" />
        {{ t('common.back') }}
      </RouterLink>
      <ol
        class="ml-auto flex items-center gap-2 text-muted-foreground"
        :aria-label="t('pickups.createView.steps')"
      >
        <template v-for="(step, index) in steps" :key="step.label">
          <!-- The line between the steps fills while the pickup is packed. -->
          <li
            v-if="index"
            class="relative h-0.5 w-10 overflow-hidden rounded bg-muted"
            aria-hidden="true"
          >
            <span
              class="absolute inset-y-0 left-0 bg-tomato transition-[width] ease-out motion-reduce:transition-none"
              :style="{
                width: phase === 'form' ? '0%' : '100%',
                transitionDuration: `${PACKING_MS}ms`,
              }"
            />
          </li>
          <li class="flex items-center gap-1.5" :aria-current="step.current ? 'step' : undefined">
            <span
              class="flex size-5 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-300"
              :class="step.current ? 'bg-tomato text-paper' : 'bg-muted'"
              >{{ index + 1 }}</span
            >
            <span
              class="transition-colors duration-300"
              :class="step.current && 'font-medium text-foreground'"
              >{{ step.label }}</span
            >
          </li>
        </template>
      </ol>
    </div>

    <!-- One card for all steps: only its content changes, the card follows its height. -->
    <div
      class="box-content overflow-hidden rounded-2xl border bg-card shadow-sm transition-[height] duration-300 ease-out motion-reduce:transition-none"
      :style="{ height: contentHeight === null ? undefined : `${contentHeight}px` }"
    >
      <div ref="content" class="p-5 sm:p-6">
        <Transition name="step" mode="out-in">
          <section
            v-if="phase === 'ready' && created"
            class="space-y-6"
            :aria-label="t('pickups.createView.yourPickupIsReady')"
          >
            <div class="space-y-1">
              <h1 class="font-heading text-2xl font-bold">
                {{
                  t('pickups.createView.titleIsReady', {
                    title: created.title || t('common.untitledPickup'),
                  })
                }}
              </h1>
              <p class="text-muted-foreground">{{ t('pickups.createView.youGetTwoLinks') }}</p>
            </div>

            <div class="grid items-start gap-6 sm:grid-cols-[13rem_1fr]">
              <!-- The QR card first: it is what most people show around at the event. -->
              <div class="mx-auto flex w-56 flex-col items-center gap-3 sm:w-full">
                <QrCard
                  ref="qr"
                  :value="shareUrl"
                  :title="created.title || t('common.untitledPickup')"
                  class="w-full"
                />
                <Button variant="outline" class="w-full" @click="qr?.save()">
                  <DownloadIcon />
                  {{ t('common.saveQrCard') }}
                </Button>
              </div>

              <div class="space-y-6">
                <div class="space-y-2">
                  <p class="flex items-center gap-1.5 font-medium">
                    <UsersIcon class="size-4 text-muted-foreground" />
                    {{ t('common.shareLink') }}
                    <span class="font-normal text-muted-foreground">{{
                      t('pickups.createView.forYourGuests')
                    }}</span>
                  </p>
                  <CopyField :value="shareUrl" :label="t('common.shareLink')" />
                  <p class="text-sm text-muted-foreground">
                    {{ t('pickups.createView.sendItToYourGuests') }}
                  </p>
                </div>

                <div class="space-y-2">
                  <p class="flex items-center gap-1.5 font-medium">
                    <KeyRoundIcon class="size-4 text-tomato" />
                    {{ t('common.yourPersonalLink') }}
                    <span class="font-normal text-muted-foreground">{{
                      t('pickups.createView.onlyForYou')
                    }}</span>
                  </p>
                  <CopyField
                    :value="absolute(created.member_url)"
                    :label="t('common.personalLink')"
                  />
                  <p class="text-sm text-muted-foreground">
                    <template v-if="emailed"
                      >{{ t('pickups.createView.weAlsoEmailedItTo') }} </template
                    >{{ t('pickups.createView.withThisLinkYouLog') }}
                  </p>
                </div>
              </div>
            </div>

            <Button as-child size="lg" class="w-full">
              <RouterLink :to="{ name: 'explorer', params: { pickupId: created.id } }">
                {{ t('common.openThePickup') }}
                <ArrowRightIcon />
              </RouterLink>
            </Button>
          </section>

          <div v-else-if="phase === 'creating'">
            <PackingAnimation />
          </div>

          <form
            v-else
            class="space-y-6"
            :aria-label="t('pickups.createView.newPickup')"
            @submit.prevent="submit"
          >
            <div class="space-y-1">
              <h1 class="font-heading text-2xl font-bold">{{ t('common.startAPickup') }}</h1>
              <p class="text-muted-foreground">
                {{ t('pickups.createView.aSharedPlaceForEveryones') }}
              </p>
            </div>

            <div class="space-y-1.5">
              <Label for="create-title">{{ t('common.nameOfThePickup') }}</Label>
              <Input
                id="create-title"
                v-model="form.title"
                required
                maxlength="200"
                :placeholder="t('pickups.createView.eGAnnaMarkS')"
                autocomplete="off"
              />
              <p v-if="fieldErrors.title" class="text-sm text-destructive">
                {{ fieldErrors.title }}
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="create-name"
                  >{{ t('common.yourName') }}
                  <span class="text-muted-foreground">{{
                    t('pickups.createView.optional')
                  }}</span></Label
                >
                <Input
                  id="create-name"
                  v-model="form.creator_name"
                  maxlength="100"
                  autocomplete="name"
                />
                <p class="text-xs text-muted-foreground">
                  {{ t('pickups.createView.youGetAFolderWith') }}
                </p>
              </div>
              <div class="space-y-1.5">
                <Label for="create-email"
                  >{{ t('common.yourEmail') }}
                  <span class="text-muted-foreground">{{
                    t('pickups.createView.optional')
                  }}</span></Label
                >
                <Input
                  id="create-email"
                  v-model="form.creator_email"
                  type="email"
                  autocomplete="email"
                />
                <p class="text-xs text-muted-foreground">
                  {{ t('pickups.createView.weSendYouYourLink') }}
                </p>
                <p v-if="fieldErrors.creator_email" class="text-sm text-destructive">
                  {{ fieldErrors.creator_email }}
                </p>
              </div>
            </div>

            <fieldset class="space-y-2">
              <legend class="mb-1 text-sm font-medium">
                {{ t('pickups.createView.whoCanJoin') }}
              </legend>
              <div class="grid gap-2 sm:grid-cols-2">
                <label
                  v-for="policy in policies"
                  :key="policy.value"
                  class="flex cursor-pointer flex-col gap-1 rounded-xl border p-3 has-checked:border-tomato has-checked:bg-tomato/5"
                >
                  <span class="flex items-center gap-2 text-sm font-medium">
                    <input
                      v-model="form.join_policy"
                      type="radio"
                      name="join_policy"
                      :value="policy.value"
                      class="accent-tomato"
                    />
                    <component :is="policy.icon" class="size-4 text-muted-foreground" />
                    {{ policy.label() }}
                  </span>
                  <span class="text-sm text-muted-foreground">{{ policy.hint() }}</span>
                </label>
              </div>
              <p class="text-xs text-muted-foreground">
                {{ t('pickups.createView.onlyParticipantsSeeThePhotos') }}
              </p>
            </fieldset>

            <Button type="submit" size="lg" class="w-full" :disabled="phase !== 'form'">
              {{ t('pickups.createView.createPickup') }}
              <ArrowRightIcon />
            </Button>
          </form>
        </Transition>
      </div>
    </div>
    <CreationCodeDialog
      v-model:open="askCode"
      @accepted="(code) => (creationCode = code)"
      @cancel="cancelCode"
    />
  </div>
</template>

<style scoped>
.step-enter-active,
.step-leave-active {
  transition:
    opacity 0.2s ease,
    translate 0.2s ease;
}
.step-enter-from {
  opacity: 0;
  translate: 0 8px;
}
.step-leave-to {
  opacity: 0;
  translate: 0 -8px;
}
@media (prefers-reduced-motion: reduce) {
  .step-enter-active,
  .step-leave-active {
    transition: opacity 0.15s;
  }
  .step-enter-from,
  .step-leave-to {
    translate: none;
  }
}
</style>
