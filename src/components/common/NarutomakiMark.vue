<script setup lang="ts">
// A narutomaki, the swirled fish cake the trans community uses as a mark. Drawn
// with currentColor. `solid` fills the disc so it reads as a cake over any page.
defineProps<{ solid?: boolean }>()
</script>

<template>
  <svg viewBox="-32 -32 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <circle r="29" stroke-width="3" :fill="solid ? 'var(--pride-white)' : 'none'" />
    <path d="M0 0a6 6 0 0 1 12 0a12 12 0 0 1-24 0a18 18 0 0 1 36 0a24 24 0 0 1-48 0" stroke-width="3.5" />
  </svg>
</template>
