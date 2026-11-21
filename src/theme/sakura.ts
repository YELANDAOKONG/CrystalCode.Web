import { ref, watchEffect } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'

// Choices that belong to the Sakura theme alone. The page holds them whether or
// not the theme is selected, so switching away and back keeps them.

export type PetalPlacement = 'behind' | 'idle' | 'both' | 'over'
const PLACEMENTS: readonly PetalPlacement[] = ['behind', 'idle', 'both', 'over']

// The working indicator. `spin` is the original turning petal and the default.
export type SpinnerStyle = 'spin' | 'blossom' | 'orbit' | 'breathe'
const SPINNER_STYLES: readonly SpinnerStyle[] = ['spin', 'blossom', 'orbit', 'breathe']

export const DEFAULT_PETAL_COUNT = 14
export const DEFAULT_PETAL_SPEED = 100
export const DEFAULT_SHOWER_COUNT = 26
export const DEFAULT_SHOWER_SPEED = 100

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
const count = ref(number('sakura-count', DEFAULT_PETAL_COUNT, 4, 100))
const speed = ref(number('sakura-speed', DEFAULT_PETAL_SPEED, 50, 250))
const shower = ref(flag('sakura-shower', true))
const showerCount = ref(number('sakura-shower-count', DEFAULT_SHOWER_COUNT, 4, 100))
const showerSpeed = ref(number('sakura-shower-speed', DEFAULT_SHOWER_SPEED, 50, 250))
const spinner = ref(flag('sakura-spinner', true))
const spinnerStyle = ref<SpinnerStyle>(SPINNER_STYLES.find((item) => item === loadPreference('sakura-spinner-style')) ?? 'spin')
const artwork = ref(flag('sakura-artwork', true))
// Off by default: the operator's own picture wins, and the artwork fills in
// when there is none.
const artworkFirst = ref(flag('sakura-artwork-first', false))
// On by default: the rounded face is the theme. Off keeps the page's own faces.
const roundedFont = ref(flag('sakura-font', true))

// The page marks whether Sakura's face is in use, so the stylesheet can pick the stack.
watchEffect(() => {
  document.documentElement.dataset.sakuraFont = roundedFont.value ? 'on' : 'off'
})

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
    showerCount,
    showerSpeed,
    spinner,
    spinnerStyle,
    artwork,
    artworkFirst,
    roundedFont,
    setPetals(value: boolean) {
      petals.value = value
      savePreference('sakura-petals', onOff(value))
    },
    setPlacement(value: PetalPlacement) {
      placement.value = value
      savePreference('sakura-placement', value)
    },
    setCount(value: number) {
      count.value = Math.min(100, Math.max(4, value))
      savePreference('sakura-count', String(count.value))
    },
    setSpeed(value: number) {
      speed.value = Math.min(250, Math.max(50, value))
      savePreference('sakura-speed', String(speed.value))
    },
    setShower(value: boolean) {
      shower.value = value
      savePreference('sakura-shower', onOff(value))
    },
    setShowerCount(value: number) {
      showerCount.value = Math.min(100, Math.max(4, value))
      savePreference('sakura-shower-count', String(showerCount.value))
    },
    setShowerSpeed(value: number) {
      showerSpeed.value = Math.min(250, Math.max(50, value))
      savePreference('sakura-shower-speed', String(showerSpeed.value))
    },
    setSpinner(value: boolean) {
      spinner.value = value
      savePreference('sakura-spinner', onOff(value))
    },
    setSpinnerStyle(value: SpinnerStyle) {
      spinnerStyle.value = value
      savePreference('sakura-spinner-style', value)
    },
    setRoundedFont(value: boolean) {
      roundedFont.value = value
      savePreference('sakura-font', onOff(value))
    },
    setArtworkFirst(value: boolean) {
      artworkFirst.value = value
      savePreference('sakura-artwork-first', onOff(value))
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

export function isSpinnerStyle(value: string): value is SpinnerStyle {
  return SPINNER_STYLES.some((item) => item === value)
}
