import { ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'

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

const preferences = {
  artwork: flag('artwork'),
  artworkFirst: flag('artwork-first'),
  particles: flag('particles'),
  shower: flag('shower', false),
  spinner: flag('spinner'),
}

export function useLavender() {
  return preferences
}
