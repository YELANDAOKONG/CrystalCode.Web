<script setup lang="ts">
// Shapes drifting down the page. Decorative: hidden from assistive technology,
// never takes a click, and moves only with transform and opacity so it runs on
// the compositor and does not repaint what is under it.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import NarutomakiMark from '@/components/common/NarutomakiMark.vue'
import type { InkShape } from '@/theme/ink'
import type { LavenderShape } from '@/theme/lavender'
import { LAVENDER_BUD, LAVENDER_FLORET, LAVENDER_LEAF } from '@/theme/lavenderMark'
import type { PrideShape } from '@/theme/pride'

type Shape = PrideShape | InkShape | LavenderShape
type Glyph = Exclude<Shape, 'mix'>
type Kind = 'petal' | 'pride' | 'ink' | 'lavender'

const props = withDefaults(defineProps<{
  /** `back` sits under the panels and shows through them; `front` sits over the page. */
  layer: 'back' | 'front'
  kind?: Kind
  /** One shape alone, or the selected theme's mix. */
  shape?: Shape
  count: number
  /** 50 to 250, where 100 is the normal pace. */
  speed?: number
  /** One quick fall that ends, instead of an endless drift. */
  shower?: boolean
}>(), { speed: 100, shower: false, kind: 'petal', shape: 'mix' })

function random(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0]!
}

/** What one theme's pieces look like. A petal draws its own shape in CSS. */
interface Look {
  /** What a mixed field draws. Repeats make a shape more common. */
  mix: readonly Glyph[]
  color(glyph: Glyph): string
  size(front: boolean, glyph: Glyph): number
  opacity(shower: boolean): number
}

const PRIDE_COLORS = ['var(--pride-blue)', 'var(--pride-pink)'] as const
const INK_COLORS = ['var(--ink-wash)', 'var(--site-ink)', 'var(--ink-wash)', 'var(--site-accent)'] as const
const LAVENDER_COLORS = ['var(--site-accent)', 'var(--lavender-bud)'] as const

const LOOKS: Record<Kind, Look> = {
  petal: {
    mix: ['sparkle'],
    color: () => '',
    size: (front) => random(10, front ? 18 : 24),
    opacity: () => random(0.55, 0.95),
  },
  // Mixed fields read as glints first. The pink brush spiral is a rarer detail.
  pride: {
    mix: ['sparkle', 'heart', 'sparkle', 'heart', 'sparkle', 'naruto'],
    color: () => pick(PRIDE_COLORS),
    size: (front, glyph) => random(7, front ? 14 : 19) + (glyph === 'naruto' ? 2 : 0),
    opacity: () => random(0.44, 0.78),
  },
  ink: {
    mix: ['fleck', 'needle', 'fleck', 'drop'],
    color: () => pick(INK_COLORS),
    size: (front) => random(5, front ? 12 : 16),
    opacity: (shower) => random(0.24, shower ? 0.64 : 0.48),
  },
  lavender: {
    mix: ['bud', 'floret', 'bud', 'leaf'],
    color: (glyph) => glyph === 'leaf' ? 'var(--lavender-stem)' : pick(LAVENDER_COLORS),
    size: (front) => random(6, front ? 12 : 15),
    opacity: (shower) => random(0.32, shower ? 0.62 : 0.5),
  },
}

const look = LOOKS[props.kind]
const glyphs: readonly Glyph[] = props.shape === 'mix' ? look.mix : [props.shape]

interface Petal {
  id: number
  glyph: Glyph
  style: Record<string, string>
}

// Built once per mount. A change to the count remounts the field.
const petals: Petal[] = Array.from({ length: props.count }, (_, id) => {
  const pace = 100 / props.speed
  const fall = props.shower ? random(2.6, 4.4) * pace : random(13, 26) * pace
  const glyph = pick(glyphs)
  return {
    id,
    glyph,
    style: {
      '--c': look.color(glyph),
      '--x': `${random(-4, 100).toFixed(1)}%`,
      '--s': `${look.size(props.layer === 'front', glyph).toFixed(1)}px`,
      '--d': `${fall.toFixed(2)}s`,
      '--f': `${random(2.2, 4.6).toFixed(2)}s`,
      // A shower starts together. A drift starts mid-fall so the page is never empty.
      '--delay': props.shower ? `${(random(0, 1.2) * pace).toFixed(2)}s` : `${(-random(0, 26) * pace).toFixed(2)}s`,
      '--drift': `${random(-18, 26).toFixed(1)}vw`,
      '--r0': `${Math.round(random(0, 360))}deg`,
      '--r1': `${Math.round(random(-360, 360))}deg`,
      '--o': look.opacity(props.shower).toFixed(2),
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
      <svg v-else viewBox="0 0 32 32" class="glyph" :data-glyph="petal.glyph" fill="currentColor">
        <path v-if="petal.glyph === 'heart'" d="M16 28C6 20 3 14 3 10a6.5 6.5 0 0 1 13-1 6.5 6.5 0 0 1 13 1c0 4-3 10-13 18Z" />
        <path v-else-if="petal.glyph === 'sparkle'" d="M16 2C17 11 21 15 30 16 21 17 17 21 16 30 15 21 11 17 2 16 11 15 15 11 16 2Z" />
        <path v-else-if="petal.glyph === 'drop'" d="M18 4c-3 7-9 10-9 16 0 4 3 7 7 7 5 0 8-3 8-8 0-4-4-8-6-15Z" />
        <path v-else-if="petal.glyph === 'needle'" d="M5 25C11 15 17 10 28 5 18 12 13 18 7 27Zm3 1c5-6 11-8 19-9-8 3-14 7-19 9Z" />
        <path v-else-if="petal.glyph === 'bud'" :d="LAVENDER_BUD" />
        <path v-else-if="petal.glyph === 'floret'" :d="LAVENDER_FLORET" />
        <path v-else-if="petal.glyph === 'leaf'" :d="LAVENDER_LEAF" />
        <path v-else d="m6 22 9-13 10-2-3 7-11 11-6 1Zm15 0 5-3-1 5-4 2Z" />
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
