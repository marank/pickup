<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PickupLogo from '@/components/PickupLogo.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePickup } from '@/features/pickups/composables/usePickup'
import { t } from '@/lib/i18n'

/**
 * The logo in the header, back to the start page. Inside a pickup it asks first.
 */
const route = useRoute()
const router = useRouter()
const pickupId = computed(() =>
  typeof route.params.pickupId === 'string' ? route.params.pickupId : '',
)
const pickup = usePickup(pickupId, () => pickupId.value !== '')
const askOpen = ref(false)

const description = computed(() => {
  const data = pickup.data.value
  if (data?.is_member) {
    return t('You stay logged in on this device. Open the pickup’s link to come back.')
  }
  return t('Open the pickup’s link to come back.')
})

function click(event: MouseEvent) {
  // Ctrl/Cmd/Shift-click or the middle button: let the browser open it in a new tab.
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  if (route.name === 'home') window.scrollTo({ top: 0, behavior: 'smooth' })
  else if (pickupId.value) askOpen.value = true
  else goHome()
}

function goHome() {
  askOpen.value = false
  void router.push({ name: 'home' })
}
</script>

<template>
  <a href="/" class="flex h-7 items-center" :aria-label="t('Pickup start page')" @click="click">
    <PickupLogo :compact="pickupId !== ''" />
  </a>

  <AlertDialog v-model:open="askOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('Leave the pickup?') }}</AlertDialogTitle>
        <AlertDialogDescription>{{ description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('Stay here') }}</AlertDialogCancel>
        <AlertDialogAction @click="goHome">{{ t('Go to the start page') }}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
