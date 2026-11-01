<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query'
import { Loader2Icon, MailIcon } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

import { api } from '@/api/client'
import { apiErrorMessage, unwrap } from '@/api/errors'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { t } from '@/lib/i18n'

/** Lost your links? The backend mails the address the pickups it belongs to. */
const email = ref('')
const sending = ref(false)
const sentMessage = ref('')
const sentOpen = ref(false)
const lookup = useMutation({
  mutationFn: (address: string) =>
    unwrap(api.POST('/api/pickups/lookup/', { body: { email: address } })),
})
/** The spinner stays a moment even when the answer is instant, so the click registers. */
const MIN_SPINNER_MS = 700
const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

async function submit() {
  sending.value = true
  try {
    const [{ message }] = await Promise.all([
      lookup.mutateAsync(email.value.trim()),
      pause(MIN_SPINNER_MS),
    ])
    sentMessage.value = message
    sentOpen.value = true
    email.value = ''
  } catch (err) {
    toast.error(apiErrorMessage(err, t('Please check the address')))
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <!-- A band of its own, like "Three steps" (HomeView). -->
  <section class="bg-ink text-paper">
    <div class="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-[1fr_1fr] md:items-center">
      <div>
        <h2 class="text-3xl font-bold">{{ t('Lost your links?') }}</h2>
        <p class="mt-2 text-paper/75">
          {{
            t(
              'Enter your email address. We send you a list of the pickups it belongs to, each with your personal link.',
            )
          }}
        </p>
      </div>
      <form class="flex gap-2" @submit.prevent="submit">
        <Input
          v-model="email"
          type="email"
          required
          :placeholder="t('you@example.com')"
          :aria-label="t('Your email')"
          class="border-paper/20 bg-paper text-ink placeholder:text-ink/50 dark:bg-paper"
          :disabled="sending"
        />
        <!-- Same width while sending, so the field next to it doesn't move. -->
        <Button
          type="submit"
          class="w-24 shrink-0 transition-transform active:scale-95"
          :class="sending && 'scale-95'"
          :disabled="sending"
          :aria-label="sending ? t('Sending') : undefined"
        >
          <Loader2Icon v-if="sending" class="animate-spin" />
          <template v-else>
            <MailIcon />
            {{ t('Send') }}
          </template>
        </Button>
      </form>
    </div>

    <Dialog v-model:open="sentOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('Check your inbox') }}</DialogTitle>
          <DialogDescription>{{ sentMessage }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button @click="sentOpen = false">{{ t('OK') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
