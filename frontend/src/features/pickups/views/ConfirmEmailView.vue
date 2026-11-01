<script setup lang="ts">
import { CircleAlertIcon, CircleCheckIcon } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { api } from '@/api/client'
import { apiErrorMessage, unwrap } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'

/** The link from the "confirm your new address" mail; the token comes after the #. */
const props = defineProps<{ pickupId: string }>()
const state = ref<'pending' | 'done' | 'failed'>('pending')
const message = ref('')

onMounted(async () => {
  const token = window.location.hash.slice(1)
  // Don't keep the token (it carries the address) in the address bar or history.
  window.history.replaceState(window.history.state, '', window.location.pathname)
  try {
    const result = await unwrap(
      api.POST('/api/pickups/{id}/session/email/confirm/', {
        params: { path: { id: props.pickupId } },
        body: { token },
      }),
    )
    message.value = result.message
    state.value = 'done'
  } catch (err) {
    message.value = apiErrorMessage(err, t('pickups.confirmEmailView.couldNotConfirmTheAddress'))
    state.value = 'failed'
  }
})
</script>

<template>
  <div class="mx-auto max-w-md space-y-4 rounded-2xl border bg-card p-6 text-center shadow-sm">
    <p v-if="state === 'pending'" class="text-muted-foreground" role="status">
      {{ t('pickups.confirmEmailView.confirmingYourAddress') }}
    </p>
    <template v-else>
      <component
        :is="state === 'done' ? CircleCheckIcon : CircleAlertIcon"
        class="mx-auto size-10"
        :class="state === 'done' ? 'text-sage' : 'text-destructive'"
      />
      <h1 class="font-heading text-2xl font-bold">
        {{
          state === 'done'
            ? t('pickups.confirmEmailView.addressConfirmed')
            : t('pickups.confirmEmailView.notConfirmed')
        }}
      </h1>
      <p class="text-muted-foreground">{{ message }}</p>
      <Button as-child class="w-full">
        <RouterLink :to="{ name: 'explorer', params: { pickupId } }">{{
          t('common.openThePickup')
        }}</RouterLink>
      </Button>
    </template>
  </div>
</template>
