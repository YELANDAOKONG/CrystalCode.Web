import { ref, watchEffect } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'
import type { PetalPlacement } from './sakura'

// Choices that belong to the Pride theme alone. The page holds them
// whether or not the theme is selected, so switching away and back keeps them.

export const DEFAULT_PRIDE_COUNT = 10
export const DEFAULT_PRIDE_SPEED = 100
export const DEFAULT_PRIDE_SHOWER_COUNT = 18
export const DEFAULT_PRIDE_SHOWER_SPEED = 100

// Which shapes fall: all three mixed, or one kind alone.
export type PrideShape = 'mix' | 'heart' | 'sparkle' | 'naruto'
const SHAPES: readonly PrideShape[] = ['mix', 'heart', 'sparkle', 'naruto']

// The working indicator. `spin` is the turning narutomaki and the default.
export type PrideSpinnerStyle = 'spin' | 'beat' | 'orbit' | 'breathe'
const SPINNER_STYLES: readonly PrideSpinnerStyle[] = ['spin', 'beat', 'orbit', 'breathe']

function flag(key: string, fallback: boolean): boolean {
  const value = loadPreference(key)
  return value === null ? fallback : value === 'on'
}

function number(key: string, fallback: number, min: number, max: number): number {
  const value = Number(loadPreference(key) ?? fallback)
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

const PLACEMENTS: readonly PetalPlacement[] = ['behind', 'idle', 'both', 'over']

const particles = ref(flag('pride-particles', true))
const placement = ref<PetalPlacement>(PLACEMENTS.find((item) => item === loadPreference('pride-placement')) ?? 'both')
const count = ref(number('pride-count', DEFAULT_PRIDE_COUNT, 4, 100))
const speed = ref(number('pride-speed', DEFAULT_PRIDE_SPEED, 50, 250))
const shape = ref<PrideShape>(SHAPES.find((item) => item === loadPreference('pride-shape')) ?? 'mix')
const showerCount = ref(number('pride-shower-count', DEFAULT_PRIDE_SHOWER_COUNT, 4, 100))
const showerSpeed = ref(number('pride-shower-speed', DEFAULT_PRIDE_SHOWER_SPEED, 50, 250))
const spinnerStyle = ref<PrideSpinnerStyle>(SPINNER_STYLES.find((item) => item === loadPreference('pride-spinner-style')) ?? 'spin')
const shower = ref(flag('pride-shower', true))
const spinner = ref(flag('pride-spinner', true))
const artwork = ref(flag('pride-artwork', true))
const artworkFirst = ref(flag('pride-artwork-first', false))
const roundedFont = ref(flag('pride-font', true))

// The page marks whether the rounded face is in use, so the stylesheet can pick the stack.
watchEffect(() => {
  document.documentElement.dataset.prideFont = roundedFont.value ? 'on' : 'off'
})

function onOff(value: boolean): string {
  return value ? 'on' : 'off'
}

export function isPrideShape(value: string): value is PrideShape {
  return SHAPES.some((item) => item === value)
}

export function isPrideSpinnerStyle(value: string): value is PrideSpinnerStyle {
  return SPINNER_STYLES.some((item) => item === value)
}

export function usePride() {
  return {
    particles,
    placement,
    count,
    speed,
    shape,
    showerCount,
    showerSpeed,
    spinnerStyle,
    shower,
    spinner,
    artwork,
    artworkFirst,
    roundedFont,
    setParticles(value: boolean) {
      particles.value = value
      savePreference('pride-particles', onOff(value))
    },
    setPlacement(value: PetalPlacement) {
      placement.value = value
      savePreference('pride-placement', value)
    },
    setCount(value: number) {
      count.value = Math.min(100, Math.max(4, value))
      savePreference('pride-count', String(count.value))
    },
    setSpeed(value: number) {
      speed.value = Math.min(250, Math.max(50, value))
      savePreference('pride-speed', String(speed.value))
    },
    setShape(value: PrideShape) {
      shape.value = value
      savePreference('pride-shape', value)
    },
    setShowerCount(value: number) {
      showerCount.value = Math.min(100, Math.max(4, value))
      savePreference('pride-shower-count', String(showerCount.value))
    },
    setShowerSpeed(value: number) {
      showerSpeed.value = Math.min(250, Math.max(50, value))
      savePreference('pride-shower-speed', String(showerSpeed.value))
    },
    setSpinnerStyle(value: PrideSpinnerStyle) {
      spinnerStyle.value = value
      savePreference('pride-spinner-style', value)
    },
    setShower(value: boolean) {
      shower.value = value
      savePreference('pride-shower', onOff(value))
    },
    setSpinner(value: boolean) {
      spinner.value = value
      savePreference('pride-spinner', onOff(value))
    },
    setRoundedFont(value: boolean) {
      roundedFont.value = value
      savePreference('pride-font', onOff(value))
    },
    setArtworkFirst(value: boolean) {
      artworkFirst.value = value
      savePreference('pride-artwork-first', onOff(value))
    },
    setArtwork(value: boolean) {
      artwork.value = value
      savePreference('pride-artwork', onOff(value))
    },
  }
}
