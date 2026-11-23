<script setup lang="ts">
import type { LavenderSpinnerStyle } from '@/theme/lavender'
import { LAVENDER_BUD, LAVENDER_FLOWERS, LAVENDER_LEAVES, LAVENDER_STEM } from '@/theme/lavenderMark'

defineProps<{ variant: LavenderSpinnerStyle }>()
</script>

<template>
  <svg viewBox="0 0 32 32" aria-hidden="true" class="lavender-spinner" :data-style="variant">
    <g v-if="variant === 'orbit'">
      <circle cx="16" cy="16" r="11.5" fill="none" stroke="var(--lavender-stem)" stroke-width="1.3" opacity=".4" />
      <path :d="LAVENDER_BUD" transform="translate(16 4.5) scale(.34) translate(-16 -16)" fill="var(--site-accent)" />
      <path :d="LAVENDER_BUD" transform="translate(25.9 21.8) rotate(120) scale(.28) translate(-16 -16)" fill="var(--lavender-bud)" />
      <path :d="LAVENDER_BUD" transform="translate(6.1 21.8) rotate(240) scale(.24) translate(-16 -16)" fill="var(--lavender-stem)" />
    </g>
    <path v-else-if="variant === 'twirl'" :d="LAVENDER_BUD" fill="var(--site-accent)" />
    <g v-else>
      <path :d="LAVENDER_STEM" fill="none" stroke="var(--lavender-stem)" stroke-width="1.8" stroke-linecap="round" />
      <path :d="LAVENDER_LEAVES" fill="var(--lavender-stem)" />
      <path :d="LAVENDER_FLOWERS" fill="var(--site-accent)" />
    </g>
  </svg>
</template>

<style scoped>
.lavender-spinner[data-style='sway'] {
  transform-origin: 28% 88%;
  animation: lavender-sway 1.8s ease-in-out infinite alternate;
}

.lavender-spinner[data-style='breathe'] {
  animation: lavender-breathe 2.2s ease-in-out infinite;
}

.lavender-spinner[data-style='orbit'] {
  animation: lavender-turn 2.1s linear infinite;
}

.lavender-spinner[data-style='twirl'] {
  animation: lavender-twirl 1.6s ease-in-out infinite;
}

@keyframes lavender-sway {
  from { transform: rotate(-14deg); }
  to { transform: rotate(9deg); }
}

@keyframes lavender-breathe {
  0%, 100% { transform: scale(.78); opacity: .6; }
  50% { transform: scale(1); opacity: 1; }
}

@keyframes lavender-turn {
  to { transform: rotate(1turn); }
}

@keyframes lavender-twirl {
  50% { transform: rotate(16deg) scaleX(.35); }
}

@media (prefers-reduced-motion: reduce) {
  .lavender-spinner[data-style] { animation: none; }
}
</style>
