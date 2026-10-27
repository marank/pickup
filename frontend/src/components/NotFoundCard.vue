<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{ title: string; description: string }>()
</script>

<template>
  <Card class="mx-auto max-w-md">
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
      <CardDescription>{{ description }}</CardDescription>
    </CardHeader>
    <CardFooter>
      <Button as-child variant="outline"
        ><RouterLink to="/">Go to the start page</RouterLink></Button
      >
    </CardFooter>
  </Card>
</template>
