<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { t } from '@/lib/i18n'

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
        ><RouterLink to="/">{{ t('common.goToTheStartPage') }}</RouterLink></Button
      >
    </CardFooter>
  </Card>
</template>
