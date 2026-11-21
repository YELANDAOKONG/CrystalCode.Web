import { ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'

// Choices that belong to the Sakura theme alone. The page holds them whether or
// not the theme is selected, so switching away and back keeps them.

export type PetalPlacement = 'behind' | 'idle' | 'both' | 'over'
const PLACEMENTS: readonly PetalPlacement[] = ['behind', 'idle', 'both', 'over']

export const DEFAULT_PETAL_COUNT = 14
export const DEFAULT_PETAL_SPEED = 100

function flag(key: string, fallback: boolean): boolean {
  const value = loadPreference(key)
  return value === null ? fallback : value === 'on'
}

function number(key: string, fallback: number, min: number, max: number): number {
  const value = Number(loadPreference(key) ?? fallback)
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

const petals = ref(flag('sakura-petals', true))
const placement = ref<PetalPlacement>(PLACEMENTS.find((item) => item === loadPreference('sakura-placement')) ?? 'both')
const count = ref(number('sakura-count', DEFAULT_PETAL_COUNT, 4, 30))
const speed = ref(number('sakura-speed', DEFAULT_PETAL_SPEED, 50, 150))
const shower = ref(flag('sakura-shower', true))
const spinner = ref(flag('sakura-spinner', true))
const artwork = ref(flag('sakura-artwork', true))

function onOff(value: boolean): string {
  return value ? 'on' : 'off'
}

export function useSakura() {
  return {
    petals,
    placement,
    count,
    speed,
    shower,
    spinner,
    artwork,
    setPetals(value: boolean) {
      petals.value = value
      savePreference('sakura-petals', onOff(value))
    },
    setPlacement(value: PetalPlacement) {
      placement.value = value
      savePreference('sakura-placement', value)
    },
    setCount(value: number) {
      count.value = Math.min(30, Math.max(4, value))
      savePreference('sakura-count', String(count.value))
    },
    setSpeed(value: number) {
      speed.value = Math.min(150, Math.max(50, value))
      savePreference('sakura-speed', String(speed.value))
    },
    setShower(value: boolean) {
      shower.value = value
      savePreference('sakura-shower', onOff(value))
    },
    setSpinner(value: boolean) {
      spinner.value = value
      savePreference('sakura-spinner', onOff(value))
    },
    setArtwork(value: boolean) {
      artwork.value = value
      savePreference('sakura-artwork', onOff(value))
    },
  }
}

export function isPetalPlacement(value: string): value is PetalPlacement {
  return PLACEMENTS.some((item) => item === value)
}
