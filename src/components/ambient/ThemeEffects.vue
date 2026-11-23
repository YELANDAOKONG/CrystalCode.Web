<script setup lang="ts">
// Combination-theme particles are mounted once at the app root.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { server } from '@/app/server'
import { useInk } from '@/theme/ink'
import { useLavender } from '@/theme/lavender'
import { usePride } from '@/theme/pride'
import { useSakura } from '@/theme/sakura'
import { useTheme } from '@/theme/theme'
import PetalField from './PetalField.vue'

/** True on a screen with nothing to read yet: the connect page or an empty session. */
const props = defineProps<{ idle: boolean }>()

const { theme } = useTheme()
const sakura = useSakura()
const pride = usePride()
const ink = useInk()
const lavender = useLavender()
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

// The particle settings of whichever theme is selected, or none.
const fx = computed(() => {
  if (theme.value === 'sakura') {
    return {
      kind: 'petal' as const,
      shape: 'mix' as const,
      on: sakura.petals.value,
      placement: sakura.placement.value,
      count: sakura.count.value,
      speed: sakura.speed.value,
      shower: sakura.shower.value,
      showerCount: sakura.showerCount.value,
      showerSpeed: sakura.showerSpeed.value,
    }
  }
  if (theme.value === 'pride') {
    return {
      kind: 'pride' as const,
      shape: pride.shape.value,
      on: pride.particles.value,
      placement: pride.placement.value,
      count: pride.count.value,
      speed: pride.speed.value,
      shower: pride.shower.value,
      showerCount: pride.showerCount.value,
      showerSpeed: pride.showerSpeed.value,
    }
  }
  if (theme.value === 'ink') {
    return {
      kind: 'ink' as const,
      shape: ink.shape.current.value,
      on: ink.particles.current.value,
      placement: ink.placement.current.value,
      count: ink.count.current.value,
      speed: ink.speed.current.value,
      shower: ink.shower.current.value,
      showerCount: ink.showerCount.current.value,
      showerSpeed: ink.showerSpeed.current.value,
    }
  }
  if (theme.value === 'lavender') {
    return {
      kind: 'lavender' as const,
      shape: lavender.shape.current.value,
      on: lavender.particles.current.value,
      placement: lavender.placement.current.value,
      count: lavender.count.current.value,
      speed: lavender.speed.current.value,
      shower: lavender.shower.current.value,
      showerShape: lavender.showerShape.current.value,
      showerCount: lavender.showerCount.current.value,
      showerSpeed: lavender.showerSpeed.current.value,
    }
  }
  return null
})

const on = computed(() => fx.value?.on === true)
const behind = computed(() => on.value && (fx.value?.placement === 'behind' || fx.value?.placement === 'both'))
const idleFront = computed(() => on.value && props.idle && (fx.value?.placement === 'idle' || fx.value?.placement === 'both'))
const over = computed(() => on.value && fx.value?.placement === 'over')

// A shower is a one-off layer that removes itself once the shapes have landed.
// The longest fall starts up to 1.2s late and lasts up to 4.4s, both at the
// base pace, so the layer's lifetime scales with the chosen speed.
const SHOWER_BASE_MS = (4.4 + 1.2) * 1000
const timers = new Set<ReturnType<typeof setTimeout>>()
let showerId = 0
interface Shower {
  id: number
  kind: NonNullable<typeof fx.value>['kind']
  shape: NonNullable<typeof fx.value>['shape']
  count: number
  speed: number
}

const showers = ref<Shower[]>([])
const visibleShowers = computed(() => showers.value.filter((item) => item.kind === fx.value?.kind))

watch(
  () => server.model.turnActive,
  (active, wasActive) => {
    if (!wasActive || active) return
    const current = fx.value
    if (!current?.shower || reducedMotion.value) return
    if (server.model.lastTurn?.reason.toLowerCase() !== 'completed') return
    const id = ++showerId
    showers.value = [...showers.value, {
      id,
      kind: current.kind,
      shape: current.showerShape ?? current.shape,
      count: current.showerCount,
      speed: current.showerSpeed,
    }]
    const lifetime = (SHOWER_BASE_MS * 100) / current.showerSpeed + 200
    const timer = setTimeout(() => {
      showers.value = showers.value.filter((item) => item.id !== id)
      timers.delete(timer)
    }, lifetime)
    timers.add(timer)
  },
)

onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <!-- The back layer goes to the body so it sits between the background image
       and the page, and shows through the translucent panels. -->
  <Teleport to="body">
    <template v-if="fx">
      <PetalField v-if="behind" :key="`back-${fx.kind}-${fx.shape}-${fx.count}-${fx.speed}`" layer="back" :kind="fx.kind" :shape="fx.shape" :count="fx.count" :speed="fx.speed" />
      <PetalField v-if="over || idleFront" :key="`front-${fx.kind}-${fx.shape}-${fx.count}-${fx.speed}`" layer="front" :kind="fx.kind" :shape="fx.shape" :count="fx.count" :speed="fx.speed" />
      <PetalField v-for="item in visibleShowers" :key="`shower-${item.id}`" layer="front" :kind="item.kind" :shape="item.shape" :count="item.count" :speed="item.speed" shower />
    </template>
  </Teleport>
</template>
