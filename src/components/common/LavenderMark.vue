<script setup lang="ts">
import { LAVENDER_FLOWERS, LAVENDER_LEAVES, LAVENDER_STEM } from '@/theme/lavender-mark'
</script>

<template>
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path :d="LAVENDER_STEM" fill="none" stroke="var(--lavender-stem)" stroke-width="1.8" stroke-linecap="round" />
    <path :d="LAVENDER_LEAVES" fill="var(--lavender-stem)" />
    <path :d="LAVENDER_FLOWERS" fill="var(--site-accent)" />
  </svg>
</template>
