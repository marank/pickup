<script setup lang="ts">
import { FolderIcon, Link2Icon, MailIcon, UserRoundXIcon } from '@lucide/vue'

import CreatePickupCard from '../components/CreatePickupCard.vue'
import JoinByCodeCard from '../components/JoinByCodeCard.vue'

const features = [
  {
    icon: UserRoundXIcon,
    title: 'No account required',
    text: 'Start sharing right away, without signing up or remembering passwords.',
  },
  {
    icon: FolderIcon,
    title: 'Personal folders',
    text: 'Everyone gets their own folder. You can change only yours, but see everything.',
  },
  {
    icon: Link2Icon,
    title: 'Easy sharing',
    text: 'One link for everyone. They join and start uploading immediately.',
  },
  {
    icon: MailIcon,
    title: 'Email reminder',
    text: 'Get your personal link by email to come back from any device.',
  },
]
</script>

<template>
  <div class="space-y-12">
    <section class="space-y-3 text-center">
      <h1 class="text-4xl font-bold tracking-tight">Pickup</h1>
      <p class="text-lg text-muted-foreground">
        Share photos and videos with a group. No account required.
      </p>
    </section>

    <section class="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
      <CreatePickupCard />
      <JoinByCodeCard />
    </section>

    <section class="space-y-6">
      <h2 class="text-center text-2xl font-semibold">How Pickup works</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="rounded-xl border bg-background p-5"
        >
          <component :is="feature.icon" class="mb-3 size-6 text-primary" />
          <h3 class="font-medium">{{ feature.title }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ feature.text }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
