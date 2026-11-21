<script setup lang="ts">
// The Sakura theme's working indicator: one petal turning, in the place of the
// spinner. It takes the accent color and stops under reduced motion.
</script>

<template>
  <svg viewBox="0 0 32 32" aria-hidden="true" class="petal-spinner" fill="currentColor">
    <path d="M16 28C8.5 22 5.5 13 11 5.5L16 9.5 21 5.5C26.5 13 23.5 22 16 28Z" />
  </svg>
</template>

<style scoped>
.petal-spinner {
  color: var(--site-accent);
  animation: petal-spin 1.6s cubic-bezier(0.45, 0, 0.25, 1) infinite;
}

@keyframes petal-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
