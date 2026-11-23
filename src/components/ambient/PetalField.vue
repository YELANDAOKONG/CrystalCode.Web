<script setup lang="ts">
// Petals drifting down the page. Decorative: hidden from assistive technology,
// never takes a click, and moves only with transform and opacity so it runs on
// the compositor and does not repaint what is under it.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import NarutomakiMark from '@/components/common/NarutomakiMark.vue'
import type { PrideShape } from '@/theme/pride'

const props = withDefaults(defineProps<{
  /** `back` sits under the panels and shows through them; `front` sits over the page. */
  layer: 'back' | 'front'
  /** `petal` is Sakura's blossom; `pride` is Pride's hearts, sparkles, and narutomaki. */
  kind?: 'petal' | 'pride'
  /** For `pride`: one shape alone, or all three mixed. */
  shape?: PrideShape
  count: number
  /** 50 to 250, where 100 is the normal pace. */
  speed?: number
  /** One quick fall that ends, instead of an endless drift. */
  shower?: boolean
}>(), { speed: 100, shower: false, kind: 'petal', shape: 'mix' })

// Mixed fields read as glints first. The pearly medallion is a rarer detail.
const GLYPHS = ['sparkle', 'heart', 'sparkle', 'heart', 'sparkle', 'naruto'] as const
const glyphs: readonly (typeof GLYPHS)[number][] = props.shape === 'mix' ? GLYPHS : [props.shape]
const COLORS = ['var(--pride-blue)', 'var(--pride-pink)'] as const

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0]!
}

interface Petal {
  id: number
  glyph: (typeof GLYPHS)[number]
  style: Record<string, string>
}

function random(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

// Built once per mount. A change to the count remounts the field.
const petals: Petal[] = Array.from({ length: props.count }, (_, id) => {
  const pace = 100 / props.speed
  const fall = props.shower ? random(2.6, 4.4) * pace : random(13, 26) * pace
  const pride = props.kind === 'pride'
  const size = pride ? random(7, props.layer === 'front' ? 14 : 19) : random(10, props.layer === 'front' ? 18 : 24)
  const opacity = pride ? random(0.44, 0.78) : random(0.55, 0.95)
  return {
    id,
    glyph: pick(glyphs),
    style: {
      '--c': pick(COLORS),
      '--x': `${random(-4, 100).toFixed(1)}%`,
      '--s': `${size.toFixed(1)}px`,
      '--d': `${fall.toFixed(2)}s`,
      '--f': `${random(2.2, 4.6).toFixed(2)}s`,
      // A shower starts together. A drift starts mid-fall so the page is never empty.
      '--delay': props.shower ? `${(random(0, 1.2) * pace).toFixed(2)}s` : `${(-random(0, 26) * pace).toFixed(2)}s`,
      '--drift': `${random(-18, 26).toFixed(1)}vw`,
      '--r0': `${Math.round(random(0, 360))}deg`,
      '--r1': `${Math.round(random(-360, 360))}deg`,
      '--o': opacity.toFixed(2),
      '--rest': `${random(4, 96).toFixed(1)}vh`,
    },
  }
})

// A hidden tab does not need to animate, and a returning one should not catch up.
const paused = ref(document.hidden)
function onVisibility(): void {
  paused.value = document.hidden
}
onMounted(() => document.addEventListener('visibilitychange', onVisibility))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisibility))
</script>

<template>
  <div class="petal-field" :data-layer="layer" :data-shower="shower ? '' : undefined" :data-paused="paused ? '' : undefined" aria-hidden="true">
    <span v-for="petal in petals" :key="petal.id" class="petal" :style="petal.style">
      <i v-if="kind === 'petal'" />
      <NarutomakiMark v-else-if="petal.glyph === 'naruto'" class="glyph" />
      <svg v-else viewBox="0 0 32 32" class="glyph" fill="currentColor">
        <path v-if="petal.glyph === 'heart'" d="M16 28C6 20 3 14 3 10a6.5 6.5 0 0 1 13-1 6.5 6.5 0 0 1 13 1c0 4-3 10-13 18Z" />
        <path v-else d="M16 2C17 11 21 15 30 16 21 17 17 21 16 30 15 21 11 17 2 16 11 15 15 11 16 2Z" />
      </svg>
    </span>
  </div>
</template>

<style scoped>
.petal-field {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.petal-field[data-layer='back'] {
  z-index: 0;
}

.petal-field[data-layer='front'] {
  z-index: 40;
}

.petal {
  position: absolute;
  top: 0;
  left: var(--x);
  width: var(--s);
  height: var(--s);
  opacity: 0;
  animation: petal-fall var(--d) linear var(--delay) infinite;
  will-change: transform, opacity;
}

.petal-field[data-shower] .petal {
  animation-iteration-count: 1;
  animation-fill-mode: both;
}

.petal-field[data-paused] .petal,
.petal-field[data-paused] .petal > i,
.petal-field[data-paused] .petal > .glyph {
  animation-play-state: paused;
}

/* A hearts-and-sparkles piece only turns in the plane, so it never flattens
   to a sliver the way a petal tipping over does. */
.petal > .glyph {
  display: block;
  width: 100%;
  height: 100%;
  color: var(--c);
  animation: glyph-sway var(--f) ease-in-out var(--delay) infinite alternate;
}

@keyframes glyph-sway {
  from {
    transform: rotate(-24deg);
  }

  to {
    transform: rotate(24deg);
  }
}

/* A petal is a rounded leaf with two soft corners. It turns and tips as it
   falls, so it catches the light on both faces. */
.petal > i {
  display: block;
  width: 100%;
  height: 80%;
  border-radius: 100% 0 100% 0;
  background: linear-gradient(135deg, var(--petal-a), var(--petal-b));
  animation: petal-flutter var(--f) ease-in-out var(--delay) infinite alternate;
}

@keyframes petal-fall {
  0% {
    opacity: 0;
    transform: translate3d(0, -8vh, 0);
  }

  8% {
    opacity: var(--o);
  }

  88% {
    opacity: var(--o);
  }

  100% {
    opacity: 0;
    transform: translate3d(var(--drift), 108vh, 0);
  }
}

@keyframes petal-flutter {
  from {
    transform: rotate(var(--r0)) rotateX(10deg) rotateY(0deg);
  }

  to {
    transform: rotate(var(--r1)) rotateX(75deg) rotateY(-35deg);
  }
}

/* The site-wide reduced-motion rule shortens every animation, which would
   throw each petal off the screen at once. Still petals stay where they are
   scattered. A shower has nothing to show, so it does not appear. */
@media (prefers-reduced-motion: reduce) {
  .petal {
    top: var(--rest);
    opacity: calc(var(--o) * 0.7);
    animation: none !important;
  }

  .petal > i,
  .petal > .glyph {
    animation: none !important;
    transform: rotate(var(--r0));
  }

  .petal-field[data-shower] {
    display: none;
  }
}
</style>
