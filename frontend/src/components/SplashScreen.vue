<script setup lang="ts">
import LogoIntro from '@/features/home/components/LogoIntro.vue'
</script>

<template>
  <!-- Covers the page while it loads underneath; App.vue decides when it goes. -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-background" role="status">
    <span class="sr-only">Opening the pickup…</span>
    <LogoIntro />
  </div>
</template>
