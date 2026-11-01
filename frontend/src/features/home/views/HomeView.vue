<script setup lang="ts">
import {
  ChevronDownIcon,
  FolderTreeIcon,
  KeyRoundIcon,
  LockIcon,
  SmartphoneIcon,
  UserRoundCheckIcon,
  VideoIcon,
} from '@lucide/vue'

import { t } from '@/lib/i18n'

import ExplorerMock from '../components/ExplorerMock.vue'
import FindPickups from '../components/FindPickups.vue'
import LogoIntro from '../components/LogoIntro.vue'
import StartPanel from '../components/StartPanel.vue'

const steps = [
  {
    title: () => t('common.startAPickup'),
    text: () => t('home.homeView.giveItANameNo'),
  },
  {
    title: () => t('home.homeView.sendTheLink'),
    text: () => t('home.homeView.inTheGroupChatBy'),
  },
  {
    title: () => t('home.homeView.everyoneAddsTheirs'),
    text: () => t('home.homeView.eachPersonGetsTheirOwn'),
  },
]

const features = [
  {
    icon: UserRoundCheckIcon,
    title: () => t('home.homeView.yourFolderYourRules'),
    text: () => t('home.homeView.everyoneSeesEverythingButOnly'),
  },
  {
    icon: VideoIcon,
    title: () => t('home.homeView.bigVideosWelcome'),
    text: () => t('home.homeView.largeFilesAreUploadedIn'),
  },
  {
    icon: FolderTreeIcon,
    title: () => t('home.homeView.browseLikeOnAComputer'),
    text: () => t('home.homeView.folderTreeAnAddressBar'),
  },
  {
    icon: SmartphoneIcon,
    title: () => t('home.homeView.madeForThePhoneToo'),
    text: () => t('home.homeView.tapToOpenSwipeThrough'),
  },
  {
    icon: LockIcon,
    title: () => t('home.homeView.onlyForPeopleWithThe'),
    text: () => t('home.homeView.noPublicGalleryNoTracking'),
  },
  {
    icon: KeyRoundIcon,
    title: () => t('home.homeView.comeBackAnyTime'),
    text: () => t('home.homeView.withYourPersonalLinkYou'),
  },
]

const faqs = [
  {
    q: () => t('common.whoCanSeeThePhotos'),
    a: () => t('home.homeView.everyoneWhoHasTheShare'),
  },
  {
    q: () => t('home.homeView.whoCanChangeOrDelete'),
    a: () => t('home.homeView.onlyTheOwnerOfA'),
  },
  {
    q: () => t('home.homeView.iOpenedThePickupOn'),
    a: () => t('home.homeView.openYourPersonalLinkYou'),
  },
  {
    q: () => t('home.homeView.whichFilesWork'),
    a: () => t('home.homeView.photosJpgPngGifWebp'),
  },
  {
    q: () => t('home.homeView.doINeedAnAccount'),
    a: () => t('home.homeView.noYouOnlyPickA'),
  },
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
            {{ t('home.homeView.pickUpThePhotos') }}
            <span class="block text-tomato">{{ t('home.homeView.fromYourLastEvent') }}</span>
          </h1>
          <p class="mx-auto max-w-lg text-lg text-muted-foreground lg:mx-0">
            {{ t('home.homeView.everyoneTookPicturesButGetting') }}
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
        <h2 class="mb-8 text-3xl font-bold">{{ t('home.homeView.threeStepsThenEveryoneS') }}</h2>
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
      <h2 class="mb-2 text-3xl font-bold">{{ t('home.homeView.simpleEnoughForEveryone') }}</h2>
      <p class="mb-8 max-w-2xl text-muted-foreground">
        {{ t('home.homeView.pickupWorksLikeTheFile') }}
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
          <h2 class="text-3xl font-bold">{{ t('home.homeView.questions') }}</h2>
          <p class="mt-2 text-muted-foreground">{{ t('home.homeView.theShortAnswers') }}</p>
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
      <span>{{ t('home.homeView.pickupCollectPhotosTogether') }}</span>
      <span>{{ t('home.homeView.noTrackingNoThirdParty') }}</span>
    </footer>
  </div>
</template>
