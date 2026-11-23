<script setup lang="ts">
import { LAVENDER_FLOWERS, LAVENDER_LEAVES, LAVENDER_STEM } from '@/theme/lavender-mark'

defineProps<{ working?: boolean }>()
</script>

<template>
  <svg viewBox="0 0 32 32" aria-hidden="true" :class="{ working }">
    <path :d="LAVENDER_STEM" fill="none" stroke="var(--lavender-stem)" stroke-width="1.8" stroke-linecap="round" />
    <path :d="LAVENDER_LEAVES" fill="var(--lavender-stem)" />
    <path :d="LAVENDER_FLOWERS" fill="var(--site-accent)" />
  </svg>
</template>

<style scoped>
.working {
  transform-origin: 28% 88%;
  animation: lavender-sway 1.8s ease-in-out infinite alternate;
}

@keyframes lavender-sway {
  from { transform: rotate(-14deg); }
  to { transform: rotate(9deg); }
}

@media (prefers-reduced-motion: reduce) {
  .working { animation: none; }
}
</style>
