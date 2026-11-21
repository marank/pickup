<script setup lang="ts">
import { Loader2Icon, MailIcon } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
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
import { pause } from '@/lib/motion'

import { useLookup } from '../composables/useLookup'

/** Lost your links? The backend mails the address the pickups it belongs to. */
const email = ref('')
const sending = ref(false)
const sentMessage = ref('')
const sentOpen = ref(false)
const lookup = useLookup()
/** The spinner stays a moment even when the answer is instant, so the click registers. */
const MIN_SPINNER_MS = 700

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
    toast.error(apiErrorMessage(err, t('common.pleaseCheckTheAddress')))
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
        <h2 class="text-3xl font-bold">{{ t('home.findPickups.lostYourLinks') }}</h2>
        <p class="mt-2 text-paper/75">
          {{ t('home.findPickups.enterYourEmailAddressWe') }}
        </p>
      </div>
      <form class="flex gap-2" @submit.prevent="submit">
        <Input
          v-model="email"
          type="email"
          required
          :placeholder="t('home.findPickups.youExampleCom')"
          :aria-label="t('common.yourEmail')"
          class="border-paper/20 bg-paper text-ink placeholder:text-ink/50 dark:bg-paper"
          :disabled="sending"
        />
        <!-- Same width while sending, so the field next to it doesn't move. -->
        <Button
          type="submit"
          class="w-24 shrink-0 transition-transform active:scale-95"
          :class="sending && 'scale-95'"
          :disabled="sending"
          :aria-label="sending ? t('home.findPickups.sending') : undefined"
        >
          <Loader2Icon v-if="sending" class="animate-spin" />
          <template v-else>
            <MailIcon />
            {{ t('common.send') }}
          </template>
        </Button>
      </form>
    </div>

    <Dialog v-model:open="sentOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('home.findPickups.checkYourInbox') }}</DialogTitle>
          <DialogDescription>{{ sentMessage }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button @click="sentOpen = false">{{ t('home.findPickups.ok') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
