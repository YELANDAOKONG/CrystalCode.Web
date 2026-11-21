import { computed, ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'
import type { MessageKey } from '@/i18n'
import { applyFavicon } from './favicon'

export type ThemeSetting = 'default' | 'ocean' | 'forest' | 'graphite' | 'crystal-intelligence' | 'frontier-intelligence' | 'sakura'
export type ThemeGroup = 'color' | 'combination' | 'product'
export type ColorMode = 'auto' | 'light' | 'dark'

interface ThemeInfo {
  id: ThemeSetting
  group: ThemeGroup
  label: MessageKey
  /** The theme has choices of its own, which get their own settings tab. */
  hasSettings: boolean
}

export const THEMES: readonly ThemeInfo[] = [
  { id: 'default', group: 'color', label: 'settings.palette.default', hasSettings: false },
  { id: 'ocean', group: 'color', label: 'settings.palette.ocean', hasSettings: false },
  { id: 'forest', group: 'color', label: 'settings.palette.forest', hasSettings: false },
  { id: 'graphite', group: 'color', label: 'settings.palette.graphite', hasSettings: false },
  { id: 'sakura', group: 'combination', label: 'settings.palette.sakura', hasSettings: true },
  { id: 'crystal-intelligence', group: 'product', label: 'settings.palette.crystalIntelligence', hasSettings: false },
  { id: 'frontier-intelligence', group: 'product', label: 'settings.palette.frontierIntelligence', hasSettings: false },
]

const setting = ref<ThemeSetting>('default')
const colorMode = ref<ColorMode>('auto')
const query = window.matchMedia('(prefers-color-scheme: dark)')
const systemDark = ref(query.matches)
export const isDark = computed(() => colorMode.value === 'dark' || (colorMode.value === 'auto' && systemDark.value))
const themeHasSettings = computed(() => THEMES.find((theme) => theme.id === setting.value)?.hasSettings === true)

function apply(): void {
  const root = document.documentElement
  root.dataset.palette = setting.value
  if (colorMode.value === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', colorMode.value)
  root.classList.toggle('dark', isDark.value)
  applyFavicon(setting.value)
}

export function initTheme(): void {
  const savedPalette = THEMES.find((theme) => theme.id === loadPreference('palette'))
  if (savedPalette) setting.value = savedPalette.id
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
    themeHasSettings,
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
