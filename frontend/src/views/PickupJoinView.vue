<template>
  <div class="pickup-join-view">
    <PickupJoin :pickup-id="pickupId" />
  </div>
</template>

<script setup lang="ts">
import PickupJoin from '@/components/PickupJoin.vue'

interface Props {
  pickupId: string
}

defineProps<Props>()
</script>

<style scoped>
.pickup-join-view {
  min-height: 100vh;
}
</style>
