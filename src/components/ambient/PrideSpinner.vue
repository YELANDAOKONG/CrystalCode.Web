<script setup lang="ts">
// Pride's working indicator, in the place of the spinner. Each style is one SVG
// so it takes the accent color and scales with the progress line. Every motion
// stops under reduced motion, leaving the still shape.
import NarutomakiMark from '@/components/common/NarutomakiMark.vue'
import type { PrideSpinnerStyle } from '@/theme/pride'

defineProps<{ variant: PrideSpinnerStyle }>()

const HEART = 'M16 28C6 20 3 14 3 10a6.5 6.5 0 0 1 13-1 6.5 6.5 0 0 1 13 1c0 4-3 10-13 18Z'
// A small heart set away from the center, for the orbit.
const SMALL_HEART = 'M0 6C-5 2.5-6.5 0-6.5-2a3.2 3.2 0 0 1 6.5-1 3.2 3.2 0 0 1 6.5 1c0 2-1.5 4.5-6.5 8Z'
const ORBIT = [
  { angle: 0, color: 'var(--pride-blue)' },
  { angle: 120, color: 'var(--pride-pink)' },
  { angle: 240, color: 'var(--site-accent)' },
]
</script>

<template>
  <NarutomakiMark v-if="variant === 'spin' || variant === 'breathe'" class="pride-spinner" :data-style="variant" />
  <svg v-else viewBox="0 0 32 32" aria-hidden="true" class="pride-spinner" :data-style="variant" fill="currentColor">
    <path v-if="variant === 'beat'" class="beat" :d="HEART" />
    <g v-else class="orbit">
      <g v-for="item in ORBIT" :key="item.angle" :transform="`rotate(${item.angle} 16 16)`">
        <path :d="SMALL_HEART" transform="translate(16 7)" :fill="item.color" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.pride-spinner {
  color: var(--site-accent);
}

.pride-spinner[data-style='spin'] {
  animation: pride-spin 1.6s cubic-bezier(0.45, 0, 0.25, 1) infinite;
}

.pride-spinner[data-style='breathe'] {
  animation: pride-breathe 1.8s ease-in-out infinite;
}

.beat,
.orbit {
  transform-box: view-box;
  transform-origin: 16px 16px;
}

.beat {
  animation: pride-beat 1.2s ease-in-out infinite;
}

.orbit {
  animation: pride-spin 2.4s linear infinite;
}

@keyframes pride-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pride-breathe {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.6;
  }

  50% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pride-beat {
  0%,
  100% {
    transform: scale(0.85);
  }

  25% {
    transform: scale(1);
  }

  45% {
    transform: scale(0.9);
  }

  60% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pride-spinner,
  .beat,
  .orbit {
    animation: none !important;
  }
}
</style>
