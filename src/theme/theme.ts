import { ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'

export type ThemeSetting = 'auto' | 'light' | 'dark'

const setting = ref<ThemeSetting>('auto')
const query = window.matchMedia('(prefers-color-scheme: dark)')

function apply(): void {
  const root = document.documentElement
  const dark = setting.value === 'dark' || (setting.value === 'auto' && query.matches)
  // `data-theme` drives the CSS palette; `.dark` drives Tailwind's `dark:` variant.
  if (setting.value === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', setting.value)
  root.classList.toggle('dark', dark)
}

export function initTheme(): void {
  const saved = loadPreference('theme')
  if (saved === 'light' || saved === 'dark' || saved === 'auto') setting.value = saved
  query.addEventListener('change', apply)
  apply()
}

export function useTheme() {
  return {
    theme: setting,
    setTheme(next: ThemeSetting) {
      setting.value = next
      savePreference('theme', next)
      apply()
    },
  }
}
