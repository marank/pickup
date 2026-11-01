<script setup lang="ts">
import {
  CalendarClockIcon,
  ChevronDownIcon,
  ImageIcon,
  ImagesIcon,
  KeyRoundIcon,
  LockIcon,
  UserRoundCheckIcon,
} from '@lucide/vue'

import { t } from '@/lib/i18n'

import ExplorerMock from '../components/ExplorerMock.vue'
import FindPickups from '../components/FindPickups.vue'
import LogoIntro from '../components/LogoIntro.vue'
import StartPanel from '../components/StartPanel.vue'

const steps = [
  { title: () => t('common.createPickup'), text: () => t('home.homeView.steps.create') },
  {
    title: () => t('home.homeView.steps.send.title'),
    text: () => t('home.homeView.steps.send.text'),
  },
  {
    title: () => t('home.homeView.steps.add.title'),
    text: () => t('home.homeView.steps.add.text'),
  },
]

const features = [
  {
    icon: UserRoundCheckIcon,
    title: () => t('home.homeView.features.ownFolder.title'),
    text: () => t('home.homeView.features.ownFolder.text'),
  },
  {
    icon: ImageIcon,
    title: () => t('home.homeView.features.quality.title'),
    text: () => t('home.homeView.features.quality.text'),
  },
  {
    icon: ImagesIcon,
    title: () => t('home.homeView.features.timeline.title'),
    text: () => t('home.homeView.features.timeline.text'),
  },
  {
    icon: LockIcon,
    title: () => t('home.homeView.features.private.title'),
    text: () => t('home.homeView.features.private.text'),
  },
  {
    icon: KeyRoundIcon,
    title: () => t('home.homeView.features.noAccount.title'),
    text: () => t('home.homeView.features.noAccount.text'),
  },
  {
    icon: CalendarClockIcon,
    title: () => t('home.homeView.features.dates.title'),
    text: () => t('home.homeView.features.dates.text'),
  },
]

const faqs = [
  { q: () => t('home.homeView.faq.see.q'), a: () => t('home.homeView.faq.see.a') },
  { q: () => t('home.homeView.faq.account.q'), a: () => t('home.homeView.faq.account.a') },
  { q: () => t('home.homeView.faq.quality.q'), a: () => t('home.homeView.faq.quality.a') },
  { q: () => t('home.homeView.faq.otherPhone.q'), a: () => t('home.homeView.faq.otherPhone.a') },
  { q: () => t('home.homeView.faq.delete.q'), a: () => t('home.homeView.faq.delete.a') },
  { q: () => t('home.homeView.faq.files.q'), a: () => t('home.homeView.faq.files.a') },
  { q: () => t('home.homeView.faq.howLong.q'), a: () => t('home.homeView.faq.howLong.a') },
]
</script>

<template>
  <div>
    <LogoIntro class="px-4 pt-8 md:pt-12" />

    <!-- Hero -->
    <section class="overflow-x-clip">
      <div
        class="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-14 md:pt-16 md:pb-20 lg:grid-cols-[1.05fr_1fr]"
      >
        <!-- Centred while the picture is below, left-aligned next to it. -->
        <div class="space-y-6 text-center lg:text-left">
          <h1 class="text-5xl leading-[0.95] font-bold sm:text-6xl">
            {{ t('home.homeView.hero.title') }}
            <span class="block text-tomato">{{ t('home.homeView.hero.titleAccent') }}</span>
          </h1>
          <p class="mx-auto max-w-lg text-lg text-muted-foreground lg:mx-0">
            {{ t('home.homeView.hero.intro') }}
          </p>
          <StartPanel />
        </div>
        <div class="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div
            class="absolute -inset-4 -z-10 rotate-2 rounded-3xl bg-butter/45 dark:bg-butter/12"
          />
          <ExplorerMock class="-rotate-1" />
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="bg-ink text-paper">
      <div class="mx-auto max-w-6xl px-4 py-14">
        <h2 class="mb-8 text-3xl font-bold">{{ t('home.homeView.steps.heading') }}</h2>
        <ol class="grid gap-6 md:grid-cols-3">
          <li v-for="(step, index) in steps" :key="index" class="flex gap-4">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-butter font-heading text-lg font-bold text-butter"
            >
              {{ index + 1 }}
            </span>
            <div>
              <h3 class="text-lg font-semibold">{{ step.title() }}</h3>
              <p class="text-paper/75">{{ step.text() }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- Features -->
    <section class="mx-auto max-w-6xl px-4 py-16">
      <h2 class="mb-2 text-3xl font-bold">{{ t('home.homeView.features.heading') }}</h2>
      <p class="mb-8 max-w-2xl text-muted-foreground">
        {{ t('home.homeView.features.subtitle') }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="(feature, index) in features"
          :key="index"
          class="rounded-xl border bg-card p-5"
        >
          <span
            class="mb-3 flex size-10 items-center justify-center rounded-lg bg-tomato/12 text-tomato"
          >
            <component :is="feature.icon" class="size-5" />
          </span>
          <h3 class="font-semibold">{{ feature.title() }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ feature.text() }}</p>
        </article>
      </div>
    </section>

    <FindPickups />

    <!-- FAQ -->
    <section class="border-t bg-pane">
      <div class="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[1fr_2fr]">
        <div>
          <h2 class="text-3xl font-bold">{{ t('home.homeView.faq.heading') }}</h2>
          <p class="mt-2 text-muted-foreground">{{ t('home.homeView.faq.subtitle') }}</p>
        </div>
        <div class="divide-y rounded-xl border bg-card">
          <details v-for="(faq, index) in faqs" :key="index" class="group px-5">
            <summary
              class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium"
            >
              {{ faq.q() }}
              <ChevronDownIcon class="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p class="pb-4 text-muted-foreground">{{ faq.a() }}</p>
          </details>
        </div>
      </div>
    </section>

    <footer
      class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground"
    >
      <span>{{ t('home.homeView.footer.tagline') }}</span>
      <span>{{ t('home.homeView.footer.noTracking') }}</span>
    </footer>
  </div>
</template>
