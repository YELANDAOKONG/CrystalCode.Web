<script setup lang="ts">
// The fluted rim and pink swirl make the narutomaki legible as a small mark.
import { NARUTOMAKI_RIM, NARUTOMAKI_SWIRL } from '@/theme/prideMark'
</script>

<template>
  <svg viewBox="0 0 32 32" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">
    <path :d="NARUTOMAKI_RIM" fill="var(--pride-white)" stroke="var(--pride-rim)" stroke-width="1.6" />
    <path :d="NARUTOMAKI_SWIRL" fill="none" stroke="var(--pride-swirl)" stroke-width="2.8" />
  </svg>
</template>
