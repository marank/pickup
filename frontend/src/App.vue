<script setup lang="ts">
import { RouterView } from 'vue-router'
import 'vue-sonner/style.css'

import { Toaster } from '@/components/ui/sonner'
import AppLayout from '@/layouts/AppLayout.vue'
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
  <Toaster rich-colors position="top-right" />
</template>
