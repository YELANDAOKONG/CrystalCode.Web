<script setup lang="ts">
// The open spiral gives the brush mark room to read at spinner size.
import { PRIDE_BRUSH_HIGHLIGHT, PRIDE_SPIRAL } from '@/theme/prideMark'
</script>

<template>
  <svg viewBox="0 0 32 32" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">
    <path :d="PRIDE_SPIRAL" fill="var(--pride-swirl)" stroke="var(--pride-swirl-outline)" stroke-width="1.7" paint-order="stroke fill" />
    <path :d="PRIDE_BRUSH_HIGHLIGHT" fill="none" stroke="var(--pride-swirl-outline)" stroke-width="0.8" opacity="0.65" />
  </svg>
</template>
