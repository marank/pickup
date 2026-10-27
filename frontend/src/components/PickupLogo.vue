<template>
  <!-- A parcel tag with a punched hole and a string: the Pickup mark. -->
  <span class="inline-flex h-full items-center gap-2">
    <svg viewBox="0 0 40 28" class="h-full w-auto" aria-hidden="true">
      <path
        d="M2 14 C 2 9, 6 6, 10 6"
        fill="none"
        stroke="var(--sage)"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path d="M12 3 h22 a4 4 0 0 1 4 4 v14 a4 4 0 0 1 -4 4 h-22 l-8 -11 z" fill="var(--tomato)" />
      <circle cx="12.5" cy="14" r="2.6" fill="var(--background)" />
      <path
        d="M20 11 h12 M20 17 h8"
        stroke="var(--paper)"
        stroke-width="2.2"
        stroke-linecap="round"
      />
    </svg>
    <span class="font-heading text-lg font-bold tracking-tight">pickup</span>
  </span>
</template>
