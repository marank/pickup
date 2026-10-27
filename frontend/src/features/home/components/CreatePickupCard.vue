<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'

import { apiErrorMessage } from '@/api/errors'
import type { CreatedPickup } from '@/api/types'
import CopyField from '@/components/CopyField.vue'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useCreatePickup } from '@/features/pickups/composables/usePickup'

const createPickup = useCreatePickup()
const created = ref<CreatedPickup | null>(null)
const absolute = (path: string) => `${window.location.origin}${path}`

async function create() {
  try {
    created.value = await createPickup.mutateAsync()
    toast.success('Pickup created')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Could not create the pickup'))
  }
}
</script>

<template>
  <Card>
    <template v-if="created">
      <CardHeader>
        <CardTitle>Your pickup is ready</CardTitle>
        <CardDescription>
          Keep the creator link for yourself; send the share link to everyone else.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-1.5">
          <p class="text-sm font-medium">Creator link (private)</p>
          <CopyField :value="absolute(created.member_url)" label="Creator link" />
        </div>
        <div class="space-y-1.5">
          <p class="text-sm font-medium">Share link</p>
          <CopyField :value="absolute(created.share_url)" label="Share link" />
        </div>
      </CardContent>
      <CardFooter>
        <Button as-child>
          <RouterLink :to="{ name: 'pickup', params: { pickupId: created.id } }">
            Open the pickup
          </RouterLink>
        </Button>
      </CardFooter>
    </template>
    <template v-else>
      <CardHeader>
        <CardTitle>Start a new pickup</CardTitle>
        <CardDescription>A shared space for photos and videos. No account needed.</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button size="lg" :disabled="createPickup.isPending.value" @click="create">
          <PlusIcon />
          {{ createPickup.isPending.value ? 'Creating…' : 'Create new pickup' }}
        </Button>
      </CardFooter>
    </template>
  </Card>
</template>
