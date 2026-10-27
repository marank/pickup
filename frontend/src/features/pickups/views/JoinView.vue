<script setup lang="ts">
import { useRoute } from 'vue-router'

import { isNotFound } from '@/api/errors'
import NotFoundCard from '@/components/NotFoundCard.vue'

import JoinPanel from '../components/JoinPanel.vue'
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
  <JoinPanel
    v-else-if="pickup.data.value"
    :pickup="pickup.data.value"
    :invalid-link="Boolean(route.query.invalidLink)"
  />
</template>
