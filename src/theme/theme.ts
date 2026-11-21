import { computed, ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'

export type ThemeSetting = 'default' | 'ocean' | 'forest' | 'crystal-intelligence' | 'frontier-intelligence'
const PALETTES: readonly ThemeSetting[] = ['default', 'ocean', 'forest', 'crystal-intelligence', 'frontier-intelligence']
export type ColorMode = 'auto' | 'light' | 'dark'

const setting = ref<ThemeSetting>('default')
const colorMode = ref<ColorMode>('auto')
const query = window.matchMedia('(prefers-color-scheme: dark)')
const systemDark = ref(query.matches)
export const isDark = computed(() => colorMode.value === 'dark' || (colorMode.value === 'auto' && systemDark.value))

function apply(): void {
  const root = document.documentElement
  root.dataset.palette = setting.value
  if (colorMode.value === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', colorMode.value)
  root.classList.toggle('dark', isDark.value)
}

export function initTheme(): void {
  const savedPalette = PALETTES.find((palette) => palette === loadPreference('palette'))
  if (savedPalette) setting.value = savedPalette
  const savedMode = loadPreference('color-mode') ?? loadPreference('theme')
  if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto') colorMode.value = savedMode
  query.addEventListener('change', (event) => {
    systemDark.value = event.matches
    apply()
  })
  apply()
}

export function useTheme() {
  return {
    theme: setting,
    colorMode,
    isDark,
    setTheme(next: ThemeSetting) {
      setting.value = next
      savePreference('palette', next)
      apply()
    },
    setColorMode(next: ColorMode) {
      colorMode.value = next
      savePreference('color-mode', next)
      apply()
    },
  }
}
