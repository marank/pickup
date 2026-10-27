<script setup lang="ts">
import { useRoute } from 'vue-router'

import { isNotFound } from '@/api/errors'
import NotFoundCard from '@/components/NotFoundCard.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import JoinForm from '../components/JoinForm.vue'
import { usePickup } from '../composables/usePickup'

const props = defineProps<{ pickupId: string }>()
const route = useRoute()
const pickup = usePickup(() => props.pickupId)
</script>

<template>
  <NotFoundCard
    v-if="isNotFound(pickup.error.value)"
    title="Pickup not found"
    description="Check the link you got, or ask for a new one."
  />
  <Card v-else class="mx-auto max-w-md">
    <CardHeader>
      <CardTitle>Join {{ pickup.data.value?.title || 'this pickup' }}</CardTitle>
      <CardDescription>
        <span v-if="route.query.invalidLink" class="block text-destructive">
          That personal link is not valid. Join again below, or ask for a new link.
        </span>
        You get your own folder for uploads and can see everyone else's.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <JoinForm :pickup-id="pickupId" />
    </CardContent>
  </Card>
</template>
