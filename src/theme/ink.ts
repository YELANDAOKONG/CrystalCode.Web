import { ref, watchEffect } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'
import type { PetalPlacement } from './sakura'

export const INK_SHAPES = ['mix', 'drop', 'needle', 'fleck'] as const
export type InkShape = (typeof INK_SHAPES)[number]
export const INK_SPINNER_STYLES = ['spin', 'stroke', 'orbit', 'breathe'] as const
export type InkSpinnerStyle = (typeof INK_SPINNER_STYLES)[number]

const PLACEMENTS: readonly PetalPlacement[] = ['behind', 'idle', 'both', 'over']

export const DEFAULT_INK_COUNT = 8
export const DEFAULT_INK_SPEED = 75
export const DEFAULT_INK_SHOWER_COUNT = 16
export const DEFAULT_INK_SHOWER_SPEED = 100

function read(key: string): string | null {
  return loadPreference(`ink-${key}`)
}

function save(key: string, value: string): void {
  savePreference(`ink-${key}`, value)
}

function flag(key: string, fallback = true) {
  const saved = read(key)
  const value = ref(saved === null ? fallback : saved === 'on')
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
  artworkFirst: flag('artwork-first', false),
  particles: flag('particles'),
  placement: choice('placement', PLACEMENTS, 'both'),
  shape: choice('shape', INK_SHAPES, 'mix'),
  count: range('count', DEFAULT_INK_COUNT, 4, 100),
  speed: range('speed', DEFAULT_INK_SPEED, 50, 250),
  shower: flag('shower'),
  showerCount: range('shower-count', DEFAULT_INK_SHOWER_COUNT, 4, 100),
  showerSpeed: range('shower-speed', DEFAULT_INK_SHOWER_SPEED, 50, 250),
  spinner: flag('spinner'),
  spinnerStyle: choice('spinner-style', INK_SPINNER_STYLES, 'spin'),
}

watchEffect(() => {
  document.documentElement.dataset.inkFont = font.current.value ? 'on' : 'off'
})

export function useInk() {
  return preferences
}
