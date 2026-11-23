<script setup lang="ts">
// Everything Sakura and Pride add that moves on its own, mounted once
// at the app root. It renders nothing under another theme.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { server } from '@/app/server'
import { usePride, type PrideShape } from '@/theme/pride'
import { useSakura } from '@/theme/sakura'
import { useTheme } from '@/theme/theme'
import PetalField from './PetalField.vue'

/** True on a screen with nothing to read yet: the connect page or an empty session. */
const props = defineProps<{ idle: boolean }>()

const { theme } = useTheme()
const sakura = useSakura()
const pride = usePride()
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

// The particle settings of whichever theme is selected, or none.
const fx = computed(() => {
  if (theme.value === 'sakura') {
    return {
      kind: 'petal' as const,
      shape: 'mix' as PrideShape,
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
  return null
})

const on = computed(() => fx.value?.on === true)
const behind = computed(() => on.value && (fx.value?.placement === 'behind' || fx.value?.placement === 'both'))
const idleFront = computed(() => on.value && props.idle && (fx.value?.placement === 'idle' || fx.value?.placement === 'both'))
const over = computed(() => on.value && fx.value?.placement === 'over')

// A shower is a one-off layer that removes itself once the petals have landed.
// The longest petal starts up to 1.2s late and falls up to 4.4s, both at the
// base pace, so the layer's lifetime scales with the chosen speed.
const SHOWER_BASE_MS = (4.4 + 1.2) * 1000
const timers = new Set<ReturnType<typeof setTimeout>>()
let showerId = 0
const showers = ref<number[]>([])

watch(
  () => server.model.turnActive,
  (active, wasActive) => {
    if (!wasActive || active) return
    const current = fx.value
    if (!current?.shower || reducedMotion.value) return
    if (server.model.lastTurn?.reason.toLowerCase() !== 'completed') return
    const id = ++showerId
    showers.value = [...showers.value, id]
    const lifetime = (SHOWER_BASE_MS * 100) / current.showerSpeed + 200
    const timer = setTimeout(() => {
      showers.value = showers.value.filter((item) => item !== id)
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
      <PetalField v-for="id in showers" :key="`shower-${id}`" layer="front" :kind="fx.kind" :shape="fx.shape" :count="fx.showerCount" :speed="fx.showerSpeed" shower />
    </template>
  </Teleport>
</template>
