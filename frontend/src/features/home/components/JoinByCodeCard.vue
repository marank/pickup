<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const router = useRouter()
const code = ref('')

/** Accepts the pickup id or a whole share link. */
function pickupIdFrom(value: string): string {
  const match = value.match(/\/pickup\/([^/?#]+)/)
  return (match?.[1] ?? value).trim()
}

function open() {
  const pickupId = pickupIdFrom(code.value)
  if (pickupId) router.push({ name: 'pickup', params: { pickupId } })
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Got a share link?</CardTitle>
      <CardDescription>Paste it (or the pickup code) to open the pickup.</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="flex gap-2" @submit.prevent="open">
        <Input v-model="code" placeholder="Share link or pickup code" aria-label="Share link" />
        <Button type="submit" variant="secondary" :disabled="!code.trim()">Open</Button>
      </form>
    </CardContent>
  </Card>
</template>
