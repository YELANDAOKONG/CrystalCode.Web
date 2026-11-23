import { computed, nextTick, ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'
import type { MessageKey } from '@/i18n'
import { applyFavicon } from './favicon'

export type ThemeSetting = 'default' | 'ocean' | 'forest' | 'graphite' | 'crystal-intelligence' | 'frontier-intelligence' | 'sakura' | 'pride' | 'ink' | 'lavender'
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
  { id: 'pride', group: 'combination', label: 'settings.palette.pride', hasSettings: true },
  { id: 'ink', group: 'combination', label: 'settings.palette.ink', hasSettings: true },
  { id: 'lavender', group: 'combination', label: 'settings.palette.lavender', hasSettings: true },
  { id: 'crystal-intelligence', group: 'product', label: 'settings.palette.crystalIntelligence', hasSettings: false },
  { id: 'frontier-intelligence', group: 'product', label: 'settings.palette.frontierIntelligence', hasSettings: false },
]

const setting = ref<ThemeSetting>('default')
const colorMode = ref<ColorMode>('auto')
const query = window.matchMedia('(prefers-color-scheme: dark)')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const systemDark = ref(query.matches)
export const isDark = computed(() => colorMode.value === 'dark' || (colorMode.value === 'auto' && systemDark.value))
const themeHasSettings = computed(() => THEMES.find((theme) => theme.id === setting.value)?.hasSettings === true)

function apply(): void {
  const root = document.documentElement
  root.dataset.palette = setting.value
  root.dataset.theme = isDark.value ? 'dark' : 'light'
  root.classList.toggle('dark', isDark.value)
  applyFavicon(setting.value)
}

interface AppearanceChange {
  palette?: ThemeSetting
  mode?: ColorMode
  systemDark?: boolean
}

let pendingChange: AppearanceChange | undefined

function changeAppearance(change: AppearanceChange): void {
  if (pendingChange) {
    Object.assign(pendingChange, change)
    return
  }

  const commit = () => {
    const latest = pendingChange ?? change
    pendingChange = undefined
    setting.value = latest.palette ?? setting.value
    colorMode.value = latest.mode ?? colorMode.value
    systemDark.value = latest.systemDark ?? systemDark.value
    apply()
  }

  const nextMode = change.mode ?? colorMode.value
  const nextDark = nextMode === 'dark' || (nextMode === 'auto' && (change.systemDark ?? systemDark.value))
  const changesLook = (change.palette !== undefined && change.palette !== setting.value) || nextDark !== isDark.value
  if (!changesLook || reducedMotion.matches || document.hidden || !document.startViewTransition) {
    commit()
    return
  }

  pendingChange = change
  const transition = document.startViewTransition(() => {
    commit()
    return nextTick()
  })
  // The browser can skip a superseded or hidden transition; its update still runs.
  void transition.ready.catch(() => {})
}

export function initTheme(): void {
  const savedPalette = THEMES.find((theme) => theme.id === loadPreference('palette'))
  if (savedPalette) setting.value = savedPalette.id
  const savedMode = loadPreference('color-mode') ?? loadPreference('theme')
  if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto') colorMode.value = savedMode
  query.addEventListener('change', (event) => {
    changeAppearance({ systemDark: event.matches })
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
      savePreference('palette', next)
      changeAppearance({ palette: next })
    },
    setColorMode(next: ColorMode) {
      savePreference('color-mode', next)
      changeAppearance({ mode: next })
    },
  }
}
