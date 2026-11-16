<script setup lang="ts">
import { InfoIcon, SmartphoneIcon } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import CopyField from '@/components/CopyField.vue'
import PickupMark from '@/components/PickupMark.vue'
import { Button } from '@/components/ui/button'
import { useCreationMode } from '@/features/pickups/composables/useCreation'
import { t } from '@/lib/i18n'

/**
 * The link that adds this server to the apps' server list (`manage.py server_link`). A code
 * for creating comes after the #, so it never reaches the server's logs; it stays in the
 * address bar, because copying the link is one way into the app.
 */
const creation = useCreationMode()

const origin = window.location.origin
const host = window.location.host
const code = new URLSearchParams(window.location.hash.slice(1)).get('code') ?? ''
const link = window.location.href

const serverName = computed(() => creation.data.value?.name || host)
const mode = computed(() => creation.data.value?.mode)

// encodeURIComponent, not URLSearchParams: a space must be %20, the apps don't read "+" as one.
const appLink = computed(() => {
  const link = `pickup://server?url=${encodeURIComponent(origin)}`
  return code ? `${link}&code=${encodeURIComponent(code)}` : link
})
</script>

<template>
  <div class="mx-auto max-w-md space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
    <div class="space-y-2 text-center">
      <PickupMark class="mx-auto size-12" />
      <h1 class="font-heading text-2xl font-bold">{{ t('home.connectView.title') }}</h1>
      <p class="text-muted-foreground">{{ t('home.connectView.intro') }}</p>
    </div>

    <div class="rounded-xl bg-pane px-4 py-3 text-center">
      <p class="font-semibold">{{ serverName }}</p>
      <p v-if="serverName !== host" class="text-sm text-muted-foreground">{{ host }}</p>
    </div>

    <Button as-child class="w-full" size="lg">
      <a :href="appLink"><SmartphoneIcon /> {{ t('home.connectView.openInApp') }}</a>
    </Button>

    <div class="space-y-2">
      <p class="text-sm text-muted-foreground">{{ t('home.connectView.orPaste') }}</p>
      <CopyField :value="link" :label="t('home.connectView.linkLabel')" />
    </div>

    <p
      v-if="mode === 'none'"
      class="flex gap-2 text-sm text-muted-foreground"
      data-testid="connect-note"
    >
      <InfoIcon class="mt-0.5 size-4 shrink-0" /> {{ t('home.connectView.creationOff') }}
    </p>
    <p
      v-else-if="mode === 'code' && code"
      class="flex gap-2 text-sm text-muted-foreground"
      data-testid="connect-note"
    >
      <InfoIcon class="mt-0.5 size-4 shrink-0" /> {{ t('home.connectView.withCode') }}
    </p>
    <p
      v-else-if="mode === 'code'"
      class="flex gap-2 text-sm text-muted-foreground"
      data-testid="connect-note"
    >
      <InfoIcon class="mt-0.5 size-4 shrink-0" /> {{ t('home.connectView.needsCode') }}
    </p>

    <p class="text-center text-sm">
      <RouterLink :to="{ name: 'home' }" class="underline underline-offset-4">
        {{ t('home.connectView.useInBrowser') }}
      </RouterLink>
    </p>
  </div>
</template>
