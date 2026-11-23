<script setup lang="ts">
import { INK_BRUSH_RING } from '@/theme/inkMark'
</script>

<template>
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path :d="INK_BRUSH_RING" fill="var(--site-ink)" />
    <path d="m23.5 13 4.8.2-.2 4.8-4.9-.2Z" fill="var(--site-accent)" />
  </svg>
</template>
