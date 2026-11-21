<script setup lang="ts">
// The Sakura theme's working indicator, in the place of the spinner. Each style
// is one SVG so it takes the accent color and scales with the progress line.
// Every motion stops under reduced motion, leaving the still petal shape.
import type { SpinnerStyle } from '@/theme/sakura'

defineProps<{ variant: SpinnerStyle }>()

const PETAL = 'M16 28C8.5 22 5.5 13 11 5.5L16 9.5 21 5.5C26.5 13 23.5 22 16 28Z'
// A petal that grows from the center outward, for the blossom.
const BLOOM = 'M16 16C12.5 12.5 12 7 16 3C20 7 19.5 12.5 16 16Z'
// A small petal set away from the center, for the orbit.
const ORBIT = 'M16 9C14 7 13.5 3.5 16 1.5C18.5 3.5 18 7 16 9Z'
const BLOOM_ANGLES = [0, 72, 144, 216, 288]
const ORBIT_ANGLES = [0, 120, 240]
</script>

<template>
  <svg viewBox="0 0 32 32" aria-hidden="true" class="petal-spinner" :data-style="variant" fill="currentColor">
    <template v-if="variant === 'blossom'">
      <g v-for="(angle, index) in BLOOM_ANGLES" :key="angle" :transform="`rotate(${angle} 16 16)`">
        <path class="bloom" :d="BLOOM" :style="{ animationDelay: `${index * 0.15}s` }" />
      </g>
    </template>
    <template v-else-if="variant === 'orbit'">
      <g class="orbit">
        <g v-for="angle in ORBIT_ANGLES" :key="angle" :transform="`rotate(${angle} 16 16)`">
          <path :d="ORBIT" />
        </g>
      </g>
    </template>
    <path v-else-if="variant === 'breathe'" class="breathe" :d="PETAL" />
    <path v-else :d="PETAL" />
  </svg>
</template>

<style scoped>
.petal-spinner {
  color: var(--site-accent);
}

.petal-spinner[data-style='spin'] {
  animation: petal-spin 1.6s cubic-bezier(0.45, 0, 0.25, 1) infinite;
}

.petal-spinner[data-style='orbit'] .orbit {
  transform-box: view-box;
  transform-origin: 16px 16px;
  animation: petal-spin 2.4s linear infinite;
}

.bloom,
.breathe {
  transform-box: view-box;
  transform-origin: 16px 16px;
}

.bloom {
  animation: petal-bloom 2.4s ease-in-out infinite;
}

.breathe {
  animation: petal-breathe 1.8s ease-in-out infinite;
}

@keyframes petal-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes petal-bloom {
  0%,
  100% {
    transform: scale(0.35);
    opacity: 0.5;
  }

  50% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes petal-breathe {
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

@media (prefers-reduced-motion: reduce) {
  .petal-spinner,
  .petal-spinner .orbit,
  .bloom,
  .breathe {
    animation: none !important;
  }
}
</style>
