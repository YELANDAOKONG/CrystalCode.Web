import { ref, watchEffect } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'
import type { PetalPlacement } from './sakura'

export const LAVENDER_SHAPES = ['mix', 'bud', 'floret', 'leaf'] as const
export type LavenderShape = (typeof LAVENDER_SHAPES)[number]
export const LAVENDER_PLACEMENTS = ['behind', 'idle', 'both', 'over'] as const satisfies readonly PetalPlacement[]
export const LAVENDER_SPINNER_STYLES = ['sway', 'breathe', 'orbit', 'twirl'] as const
export type LavenderSpinnerStyle = (typeof LAVENDER_SPINNER_STYLES)[number]

function flag(name: string, fallback = true) {
  const key = `lavender-${name}`
  const saved = loadPreference(key)
  const current = ref(saved === null ? fallback : saved === 'on')
  return {
    current,
    set(value: boolean) {
      savePreference(key, value ? 'on' : 'off')
      current.value = value
    },
  }
}

function choice<T extends string>(name: string, options: readonly T[], fallback: T) {
  const key = `lavender-${name}`
  const saved = loadPreference(key)
  const current = ref(options.find((item) => item === saved) ?? fallback)
  return {
    current,
    set(value: string) {
      const match = options.find((item) => item === value)
      if (match === undefined) return
      savePreference(key, match)
      current.value = match
    },
  }
}

function range(name: string, defaultValue: number, min: number, max: number) {
  const key = `lavender-${name}`
  const clamp = (value: number) => Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : defaultValue
  const current = ref(clamp(Number(loadPreference(key) ?? defaultValue)))
  return {
    current,
    defaultValue,
    min,
    max,
    set(value: number) {
      const next = clamp(value)
      savePreference(key, String(next))
      current.value = next
    },
  }
}

const preferences = {
  artwork: flag('artwork'),
  artworkFirst: flag('artwork-first'),
  font: flag('font', false),
  particles: flag('particles'),
  placement: choice('placement', LAVENDER_PLACEMENTS, 'over'),
  shape: choice('shape', LAVENDER_SHAPES, 'mix'),
  count: range('count', 20, 4, 100),
  speed: range('speed', 75, 50, 250),
  shower: flag('shower'),
  showerShape: choice('shower-shape', LAVENDER_SHAPES, 'mix'),
  showerCount: range('shower-count', 14, 4, 100),
  showerSpeed: range('shower-speed', 100, 50, 250),
  spinner: flag('spinner'),
  spinnerStyle: choice('spinner-style', LAVENDER_SPINNER_STYLES, 'sway'),
}

watchEffect(() => {
  document.documentElement.toggleAttribute('data-lavender-serif', preferences.font.current.value)
})

export function useLavender() {
  return preferences
}
