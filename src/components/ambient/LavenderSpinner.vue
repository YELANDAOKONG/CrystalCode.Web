<script setup lang="ts">
import LavenderMark from '@/components/common/LavenderMark.vue'
import type { LavenderSpinnerStyle } from '@/theme/lavender'
import { LAVENDER_BUD } from '@/theme/lavender-mark'

defineProps<{ variant: LavenderSpinnerStyle }>()
</script>

<template>
  <span class="lavender-spinner" :data-style="variant" aria-hidden="true">
    <svg v-if="variant === 'orbit'" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="11" fill="none" stroke="var(--lavender-stem)" stroke-width="1.5" opacity=".65" />
      <path :d="LAVENDER_BUD" transform="translate(16 5) scale(.38) translate(-16 -16)" fill="var(--site-accent)" />
      <path :d="LAVENDER_BUD" transform="translate(25.5 21.5) rotate(120) scale(.32) translate(-16 -16)" fill="var(--lavender-bud)" />
      <path :d="LAVENDER_BUD" transform="translate(6.5 21.5) rotate(240) scale(.28) translate(-16 -16)" fill="var(--lavender-stem)" />
    </svg>
    <svg v-else-if="variant === 'twirl'" viewBox="0 0 32 32">
      <path :d="LAVENDER_BUD" fill="var(--site-accent)" />
      <path d="M11 25c2-6 6-12 10-17" fill="none" stroke="var(--site-button-ink)" stroke-width="1.3" stroke-linecap="round" />
    </svg>
    <LavenderMark v-else />
  </span>
</template>

<style scoped>
.lavender-spinner > svg {
  display: block;
  width: 100%;
  height: 100%;
}

.lavender-spinner[data-style='sway'] > svg {
  transform-origin: 28% 88%;
  animation: lavender-sway 1.8s ease-in-out infinite alternate;
}

.lavender-spinner[data-style='breathe'] > svg {
  animation: lavender-breathe 2.2s ease-in-out infinite;
}

.lavender-spinner[data-style='orbit'] > svg {
  animation: lavender-orbit 2.1s linear infinite;
}

.lavender-spinner[data-style='twirl'] > svg {
  animation: lavender-twirl 1.6s ease-in-out infinite;
}

@keyframes lavender-sway {
  from { transform: rotate(-14deg); }
  to { transform: rotate(9deg); }
}

@keyframes lavender-breathe {
  0%, 100% { transform: scale(.8); opacity: .65; }
  50% { transform: scale(1); opacity: 1; }
}

@keyframes lavender-orbit {
  to { transform: rotate(1turn); }
}

@keyframes lavender-twirl {
  50% { transform: rotate(16deg) scaleX(.35); }
}

@media (prefers-reduced-motion: reduce) {
  .lavender-spinner[data-style] > svg { animation: none; }
}
</style>
