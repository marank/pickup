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

import ExplorerMock from '../components/ExplorerMock.vue'
import FindPickups from '../components/FindPickups.vue'
import LogoIntro from '../components/LogoIntro.vue'
import StartPanel from '../components/StartPanel.vue'

const steps = [
  { title: 'Start a pickup', text: 'Give it a name. No sign-up, no app to install.' },
  { title: 'Send the link', text: 'In the group chat, by email or anywhere else.' },
  {
    title: 'Everyone adds theirs',
    text: 'Each person gets their own folder and uploads straight from their phone.',
  },
]

const features = [
  {
    icon: UserRoundCheckIcon,
    title: 'Your folder, your rules',
    text: 'Everyone sees everything, but only you can add, rename or delete in your folder — subfolders included.',
  },
  {
    icon: VideoIcon,
    title: 'Big videos welcome',
    text: 'Large files are uploaded in small parts. A part that fails is sent again, so a bad connection doesn’t break the upload.',
  },
  {
    icon: FolderTreeIcon,
    title: 'Browse like on a computer',
    text: 'Folder tree, an address bar you can type into, list and preview views, sorting and search.',
  },
  {
    icon: SmartphoneIcon,
    title: 'Made for the phone, too',
    text: 'Tap to open, swipe through photos, upload from the camera roll. Same pickup on every device.',
  },
  {
    icon: LockIcon,
    title: 'Only for people with the link',
    text: 'No public gallery, no tracking, no ads, nothing loaded from other companies.',
  },
  {
    icon: KeyRoundIcon,
    title: 'Come back any time',
    text: 'With your personal link you can log in on any device. Leave an email address and we send it to you.',
  },
]

const faqs = [
  {
    q: 'Who can see the photos?',
    a: 'Everyone who has the share link of the pickup. There is no public listing and no search engine can find it.',
  },
  {
    q: 'Who can change or delete things?',
    a: 'Only the owner of a folder, in their own folder and its subfolders. Nobody can delete someone else’s photos.',
  },
  {
    q: 'I opened the pickup on a different phone. Where is my folder?',
    a: 'Open your personal link (you got it when you joined, or by email). It logs you in on that device.',
  },
  {
    q: 'Which files work?',
    a: 'Photos (JPG, PNG, GIF, WebP, BMP) and videos (MP4, MOV, AVI, WMV, FLV, WebM, MKV). Large videos are fine.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. You only pick a name when you join.',
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
            Pick up the photos
            <span class="block text-tomato">from your last event.</span>
          </h1>
          <p class="mx-auto max-w-lg text-lg text-muted-foreground lg:mx-0">
            Everyone took pictures, but getting them all is always a hassle. Pickup collects them in
            one place: one link, and every guest gets their own folder. No accounts.
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
        <h2 class="mb-8 text-3xl font-bold">Three steps, then everyone’s in</h2>
        <ol class="grid gap-6 md:grid-cols-3">
          <li v-for="(step, index) in steps" :key="step.title" class="flex gap-4">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-butter font-heading text-lg font-bold text-butter"
            >
              {{ index + 1 }}
            </span>
            <div>
              <h3 class="text-lg font-semibold">{{ step.title }}</h3>
              <p class="text-paper/75">{{ step.text }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- Features -->
    <section class="mx-auto max-w-6xl px-4 py-16">
      <h2 class="mb-2 text-3xl font-bold">Simple enough for everyone</h2>
      <p class="mb-8 max-w-2xl text-muted-foreground">
        Pickup works like the file browser you already know.
      </p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="feature in features"
          :key="feature.title"
          class="rounded-xl border bg-card p-5"
        >
          <span
            class="mb-3 flex size-10 items-center justify-center rounded-lg bg-tomato/12 text-tomato"
          >
            <component :is="feature.icon" class="size-5" />
          </span>
          <h3 class="font-semibold">{{ feature.title }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ feature.text }}</p>
        </article>
      </div>
    </section>

    <FindPickups />

    <!-- FAQ -->
    <section class="border-t bg-pane">
      <div class="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[1fr_2fr]">
        <div>
          <h2 class="text-3xl font-bold">Questions</h2>
          <p class="mt-2 text-muted-foreground">The short answers.</p>
        </div>
        <div class="divide-y rounded-xl border bg-card">
          <details v-for="faq in faqs" :key="faq.q" class="group px-5">
            <summary
              class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium"
            >
              {{ faq.q }}
              <ChevronDownIcon class="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p class="pb-4 text-muted-foreground">{{ faq.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <footer
      class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground"
    >
      <span>Pickup — collect photos together.</span>
      <span>No tracking. No third-party content.</span>
    </footer>
  </div>
</template>
