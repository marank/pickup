<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query'
import { MailIcon } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

import { api } from '@/api/client'
import { apiErrorMessage, unwrap } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Lost your links? The backend mails the address the pickups it belongs to. */
const email = ref('')
const sent = ref('')
const lookup = useMutation({
  mutationFn: (address: string) =>
    unwrap(api.POST('/api/pickups/lookup/', { body: { email: address } })),
})

async function submit() {
  try {
    sent.value = (await lookup.mutateAsync(email.value.trim())).message
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Please check the address'))
  }
}
</script>

<template>
  <!-- A band of its own, like "Three steps" (HomeView). -->
  <section class="bg-ink text-paper">
    <div class="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-[1fr_1fr] md:items-center">
      <div>
        <h2 class="text-3xl font-bold">Lost your links?</h2>
        <p class="mt-2 text-paper/75">
          Enter your email address. We send you a list of the pickups it belongs to, each with your
          personal link.
        </p>
      </div>
      <form class="space-y-2" @submit.prevent="submit">
        <div class="flex gap-2">
          <Input
            v-model="email"
            type="email"
            required
            placeholder="you@example.com"
            aria-label="Your email"
            class="border-paper/20 bg-paper text-ink placeholder:text-ink/50 dark:bg-paper"
          />
          <Button type="submit" :disabled="lookup.isPending.value">
            <MailIcon />
            Send
          </Button>
        </div>
        <p v-if="sent" class="text-sm text-paper/75" role="status">{{ sent }}</p>
      </form>
    </div>
  </section>
</template>
