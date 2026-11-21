<script setup lang="ts">
// Everything Sakura adds that moves on its own, mounted once at the app root.
// It renders nothing under another theme.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { server } from '@/app/server'
import { useSakura } from '@/theme/sakura'
import { useTheme } from '@/theme/theme'
import PetalField from './PetalField.vue'

/** True on a screen with nothing to read yet: the connect page or an empty session. */
const props = defineProps<{ idle: boolean }>()

const { theme } = useTheme()
const sakura = useSakura()
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

const on = computed(() => theme.value === 'sakura' && sakura.petals.value)
const behind = computed(() => on.value && (sakura.placement.value === 'behind' || sakura.placement.value === 'both'))
const idleFront = computed(() => on.value && props.idle && (sakura.placement.value === 'idle' || sakura.placement.value === 'both'))
const over = computed(() => on.value && sakura.placement.value === 'over')

// A shower is a one-off layer that removes itself once the petals have landed.
const SHOWER_MS = 6000
const SHOWER_PETALS = 26
const showers = ref<number[]>([])
let showerId = 0
const timers = new Set<ReturnType<typeof setTimeout>>()

watch(
  () => server.model.turnActive,
  (active, wasActive) => {
    if (!wasActive || active) return
    if (theme.value !== 'sakura' || !sakura.shower.value || reducedMotion.value) return
    if (server.model.lastTurn?.reason.toLowerCase() !== 'completed') return
    const id = ++showerId
    showers.value = [...showers.value, id]
    const timer = setTimeout(() => {
      showers.value = showers.value.filter((item) => item !== id)
      timers.delete(timer)
    }, SHOWER_MS)
    timers.add(timer)
  },
)

onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <!-- The back layer goes to the body so it sits between the background image
       and the page, and shows through the translucent panels. -->
  <Teleport to="body">
    <PetalField v-if="behind" :key="`back-${sakura.count.value}-${sakura.speed.value}`" layer="back" :count="sakura.count.value" :speed="sakura.speed.value" />
    <PetalField v-if="over || idleFront" :key="`front-${sakura.count.value}-${sakura.speed.value}`" layer="front" :count="sakura.count.value" :speed="sakura.speed.value" />
    <PetalField v-for="id in showers" :key="`shower-${id}`" layer="front" :count="SHOWER_PETALS" shower />
  </Teleport>
</template>
