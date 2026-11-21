import { computed, ref, watch, type Ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'
import { isDark } from './theme'

export type BackgroundSource = 'none' | 'url' | 'file'
export type BackgroundSlot = 'shared' | 'light' | 'dark'

interface BackgroundSettings {
  source: BackgroundSource
  value: string
  blur: number
}

const MAX_IMAGE_BYTES = 768 * 1024
const MIN_OPACITY = 50
// Without backdrop blur a translucent panel shows the image's detail through
// the text, so the panels stay nearly opaque.
const BLUR_SUPPORTED = CSS.supports('backdrop-filter', 'blur(1px)')
const EMPTY: BackgroundSettings = { source: 'none', value: '', blur: 0 }

function readNumber(key: string, fallback: number, min: number, max: number): number {
  const value = Number(loadPreference(key) ?? fallback)
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

function readBackground(key: string): BackgroundSettings {
  const raw = loadPreference(key)
  if (!raw) return { ...EMPTY }
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return { ...EMPTY }
    const item = value as Record<string, unknown>
    if (item.source !== 'url' && item.source !== 'file') return { ...EMPTY }
    if (typeof item.value !== 'string') return { ...EMPTY }
    if (item.source === 'url') {
      const url = new URL(item.value)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ...EMPTY }
    } else if (!item.value.startsWith('data:image/')) return { ...EMPTY }
    return { source: item.source, value: item.value, blur: typeof item.blur === 'number' ? Math.min(24, Math.max(0, item.blur)) : 0 }
  } catch {
    return { ...EMPTY }
  }
}

const separate = ref(loadPreference('background-separate') === 'on')
const slots: Record<BackgroundSlot, Ref<BackgroundSettings>> = {
  shared: ref(readBackground('background-shared')),
  light: ref(readBackground('background-light')),
  dark: ref(readBackground('background-dark')),
}
const acrylic = ref(loadPreference('acrylic') === 'on')
const opacity = ref(readNumber('acrylic-opacity', 76, MIN_OPACITY, 95))
const acrylicBlur = ref(readNumber('acrylic-blur', 16, 0, 32))
const current = computed(() => slots[separate.value ? (isDark.value ? 'dark' : 'light') : 'shared'].value)

function applyBackground(): void {
  const root = document.documentElement
  const background = current.value
  root.style.setProperty('--custom-background-image', background.value ? `url("${background.value.replace(/["\\\n\r]/g, '\\$&')}")` : 'none')
  // Panels are translucent over this one layer, so its blur is the panels' blur.
  root.style.setProperty('--background-blur', `${background.blur + (acrylic.value ? acrylicBlur.value : 0)}px`)
  root.dataset.acrylic = acrylic.value ? 'on' : 'off'
  root.style.setProperty('--acrylic-opacity', `${(BLUR_SUPPORTED ? opacity.value : Math.max(opacity.value, 94)) / 100}`)
  root.style.setProperty('--acrylic-blur', `${acrylicBlur.value}px`)
}

function validate(next: BackgroundSettings): void {
  if (next.source === 'url' && next.value) {
    const url = new URL(next.value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Background URL must use HTTP or HTTPS')
  }
  if (next.source === 'file' && next.value && !next.value.startsWith('data:image/')) throw new Error('Background must be an image')
}

/** Returns false when the browser refuses to store it; the old value stays. */
function store(slot: BackgroundSlot, next: BackgroundSettings): boolean {
  try {
    savePreference(`background-${slot}`, JSON.stringify(next))
  } catch {
    // Storage quota: keep the previous background rather than one that would
    // vanish on reload.
    return false
  }
  slots[slot].value = next
  applyBackground()
  return true
}

watch([current, acrylic, opacity, acrylicBlur, isDark], applyBackground, { immediate: true, deep: true })

export function useAppearance() {
  return {
    separate,
    slots,
    acrylic,
    opacity,
    acrylicBlur,
    setSeparate(value: boolean) {
      separate.value = value
      savePreference('background-separate', value ? 'on' : 'off')
      applyBackground()
    },
    setAcrylic(value: boolean) {
      acrylic.value = value
      savePreference('acrylic', value ? 'on' : 'off')
      applyBackground()
    },
    setOpacity(value: number) {
      opacity.value = Math.min(95, Math.max(MIN_OPACITY, value))
      savePreference('acrylic-opacity', String(opacity.value))
      applyBackground()
    },
    setAcrylicBlur(value: number) {
      acrylicBlur.value = Math.min(32, Math.max(0, value))
      savePreference('acrylic-blur', String(acrylicBlur.value))
      applyBackground()
    },
    setBackground(slot: BackgroundSlot, patch: Partial<BackgroundSettings>): boolean {
      const next = { ...slots[slot].value, ...patch }
      validate(next)
      return store(slot, next)
    },
    async setFile(slot: BackgroundSlot, file: File): Promise<boolean> {
      if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) return false
      const value = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid image'))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      return store(slot, { ...slots[slot].value, source: 'file', value })
    },
    clearBackground(slot: BackgroundSlot) {
      store(slot, { ...EMPTY })
    },
  }
}

export function initAppearance(): void {
  applyBackground()
}
