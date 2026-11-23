<script setup lang="ts">
import type { InkSpinnerStyle } from '@/theme/ink'
import { INK_BRUSH_RING } from '@/theme/inkMark'

defineProps<{ variant: InkSpinnerStyle }>()
</script>

<template>
  <svg viewBox="0 0 32 32" aria-hidden="true" class="ink-spinner" :data-style="variant" fill="currentColor">
    <g v-if="variant === 'orbit'">
      <circle cx="16" cy="16" r="11.5" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".36" />
      <circle cx="16" cy="4.5" r="3.4" />
      <circle cx="25.9" cy="21.8" r="2.7" fill="var(--site-accent)" />
      <circle cx="6.1" cy="21.8" r="2.1" fill="var(--ink-wash)" />
    </g>
    <g v-else-if="variant === 'stroke'">
      <path d="M5 24c6-2 11-10 18-16 2-2 5-3 6-3-2 2-3 7-6 9-7 4-10 12-18 13l-3-1Z" />
      <path d="m5 28 6-3 2 .3-6 3Z" fill="var(--ink-wash)" />
    </g>
    <path v-else :d="INK_BRUSH_RING" />
  </svg>
</template>

<style scoped>
.ink-spinner {
  color: var(--site-ink);
}

.ink-spinner:is([data-style='spin'], [data-style='orbit']) {
  animation: ink-turn 2.1s linear infinite;
}

.ink-spinner[data-style='stroke'] {
  animation: ink-stroke 1.65s ease-in-out infinite;
}

.ink-spinner[data-style='breathe'] {
  animation: ink-breathe 2.2s ease-in-out infinite;
}

@keyframes ink-turn {
  to { transform: rotate(1turn); }
}

@keyframes ink-stroke {
  0%, 100% { transform: translate(-6%, 5%) scale(.78); opacity: .52; }
  45%, 70% { transform: translate(0) scale(1); opacity: 1; }
}

@keyframes ink-breathe {
  0%, 100% { transform: scale(.73); opacity: .55; }
  50% { transform: scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .ink-spinner[data-style] { animation: none; }
}
</style>
