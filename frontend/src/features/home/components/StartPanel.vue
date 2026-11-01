<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import CreationCodeDialog from '@/features/pickups/components/CreationCodeDialog.vue'
import { creationCode, useCreationMode } from '@/features/pickups/composables/useCreation'
import { t } from '@/lib/i18n'

const router = useRouter()
const creation = useCreationMode()
const askCode = ref(false)

function accepted(code: string) {
  creationCode.value = code
  void router.push({ name: 'create' })
}
</script>

<template>
  <p v-if="creation.data.value?.mode === 'none'" class="text-muted-foreground">
    {{ t('Creating new pickups is turned off on this server.') }}
  </p>
  <Button
    v-else-if="creation.data.value?.mode === 'code'"
    size="lg"
    class="h-12 px-5 text-base"
    @click="askCode = true"
  >
    <PlusIcon />
    {{ t('Start a pickup') }}
  </Button>
  <Button v-else as-child size="lg" class="h-12 px-5 text-base">
    <RouterLink :to="{ name: 'create' }">
      <PlusIcon />
      {{ t('Start a pickup') }}
    </RouterLink>
  </Button>
  <CreationCodeDialog v-model:open="askCode" @accepted="accepted" @cancel="askCode = false" />
</template>
