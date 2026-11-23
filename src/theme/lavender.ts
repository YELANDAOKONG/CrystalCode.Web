import { ref, watchEffect } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'
import type { PetalPlacement } from './sakura'

export const LAVENDER_SHAPES = ['mix', 'bud', 'floret', 'leaf'] as const
export type LavenderShape = (typeof LAVENDER_SHAPES)[number]
export const LAVENDER_SPINNER_STYLES = ['sway', 'breathe', 'orbit', 'twirl'] as const
export type LavenderSpinnerStyle = (typeof LAVENDER_SPINNER_STYLES)[number]

const PLACEMENTS: readonly PetalPlacement[] = ['behind', 'idle', 'both', 'over']

export const DEFAULT_LAVENDER_COUNT = 10
export const DEFAULT_LAVENDER_SPEED = 75
export const DEFAULT_LAVENDER_SHOWER_COUNT = 16
export const DEFAULT_LAVENDER_SHOWER_SPEED = 100

function read(key: string): string | null {
  return loadPreference(`lavender-${key}`)
}

function save(key: string, value: string): void {
  savePreference(`lavender-${key}`, value)
}

function flag(key: string) {
  const value = ref((read(key) ?? 'on') === 'on')
  return {
    current: value,
    set(next: boolean) {
      value.value = next
      save(key, next ? 'on' : 'off')
    },
  }
}

function range(key: string, fallback: number, min: number, max: number) {
  const clamp = (next: number) => Number.isFinite(next) ? Math.min(max, Math.max(min, next)) : fallback
  const value = ref(clamp(Number(read(key) ?? fallback)))
  return {
    current: value,
    set(next: number) {
      value.value = clamp(next)
      save(key, String(value.value))
    },
  }
}

function choice<T extends string>(key: string, options: readonly T[], fallback: T) {
  const saved = read(key)
  const value = ref(options.find((item) => item === saved) ?? fallback)
  return {
    current: value,
    set(next: string) {
      const match = options.find((item) => item === next)
      if (match === undefined) return
      value.value = match
      save(key, match)
    },
  }
}

const font = flag('font')
const preferences = {
  font,
  artwork: flag('artwork'),
  artworkFirst: flag('artwork-first'),
  particles: flag('particles'),
  placement: choice('placement', PLACEMENTS, 'over'),
  shape: choice('shape', LAVENDER_SHAPES, 'mix'),
  count: range('count', DEFAULT_LAVENDER_COUNT, 4, 100),
  speed: range('speed', DEFAULT_LAVENDER_SPEED, 50, 250),
  shower: flag('shower'),
  showerCount: range('shower-count', DEFAULT_LAVENDER_SHOWER_COUNT, 4, 100),
  showerSpeed: range('shower-speed', DEFAULT_LAVENDER_SHOWER_SPEED, 50, 250),
  spinner: flag('spinner'),
  spinnerStyle: choice('spinner-style', LAVENDER_SPINNER_STYLES, 'sway'),
}

watchEffect(() => {
  document.documentElement.dataset.lavenderFont = font.current.value ? 'on' : 'off'
})

export function useLavender() {
  return preferences
}
