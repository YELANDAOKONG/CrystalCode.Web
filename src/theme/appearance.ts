import { computed, reactive, ref, watch, type Ref } from 'vue'
import { deleteBlob, loadBlob, loadPreference, saveBlob, savePreference } from '@/connection/storage'
import { isDark, useTheme } from './theme'
import { useInk } from './ink'
import { useLavender } from './lavender'
import { usePride } from './pride'
import { useSakura } from './sakura'
import sakuraDay from '@/assets/sakura/day.svg'
import sakuraNight from '@/assets/sakura/night.svg'
import prideDay from '@/assets/pride/day.svg'
import prideNight from '@/assets/pride/night.svg'
import inkLandscape from '@/assets/ink/landscape.svg?inline'
import lavenderDay from '@/assets/lavender/day.svg'
import lavenderNight from '@/assets/lavender/night.svg'

export type BackgroundSource = 'none' | 'url' | 'file'
export type BackgroundSlot = 'shared' | 'light' | 'dark'

interface BackgroundSettings {
  source: BackgroundSource
  /** The address for `url`. A `file` image lives in IndexedDB, not here. */
  value: string
  /** The chosen file's name, for display. */
  name: string
  blur: number
}

const MAX_IMAGE_BYTES = 50 * 1024 * 1024
const DEFAULT_PANEL_OPACITY = 76
const INK_ARTWORK_PANEL_OPACITY = 60
const DEFAULT_PANEL_BLUR = 16
const SAKURA_ARTWORK_PANEL_BLUR = 3
const PRIDE_ARTWORK_PANEL_BLUR = 2
const INK_ARTWORK_PANEL_BLUR = 1
const LAVENDER_ARTWORK_PANEL_BLUR = 0
const SLOTS: BackgroundSlot[] = ['shared', 'light', 'dark']
const EMPTY: BackgroundSettings = { source: 'none', value: '', name: '', blur: 0 }

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
    const blur = typeof item.blur === 'number' ? Math.min(24, Math.max(0, item.blur)) : 0
    if (item.source === 'file') {
      return { source: 'file', value: '', name: typeof item.name === 'string' ? item.name : '', blur }
    }
    if (item.source !== 'url' || typeof item.value !== 'string') return { ...EMPTY }
    const url = new URL(item.value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ...EMPTY }
    return { source: 'url', value: item.value, name: '', blur }
  } catch {
    return { ...EMPTY }
  }
}

const separate = ref(loadPreference('background-separate') === 'on')
// Off keeps the saved images but shows none of them.
const enabled = ref(loadPreference('background-enabled') !== 'off')
const slots: Record<BackgroundSlot, Ref<BackgroundSettings>> = {
  shared: ref(readBackground('background-shared')),
  light: ref(readBackground('background-light')),
  dark: ref(readBackground('background-dark')),
}
// Object URLs for the stored files. They exist only while the page is open.
const fileUrls = reactive<Record<BackgroundSlot, string>>({ shared: '', light: '', dark: '' })
const sharedOpacity = ref(readNumber('acrylic-opacity', DEFAULT_PANEL_OPACITY, 50, 95))
const inkArtworkOpacity = ref(readNumber('ink-artwork-opacity', INK_ARTWORK_PANEL_OPACITY, 50, 95))
const lavenderArtworkOpacity = ref(loadPreference('lavender-artwork-opacity') === null
  ? null
  : readNumber('lavender-artwork-opacity', DEFAULT_PANEL_OPACITY, 50, 95))
const sharedPanelBlur = ref(readNumber('acrylic-blur', DEFAULT_PANEL_BLUR, 0, 32))
const sakuraArtworkBlur = ref(readNumber('sakura-artwork-blur', SAKURA_ARTWORK_PANEL_BLUR, 0, 32))
const prideArtworkBlur = ref(readNumber('pride-artwork-blur', PRIDE_ARTWORK_PANEL_BLUR, 0, 32))
const inkArtworkBlur = ref(readNumber('ink-artwork-blur', INK_ARTWORK_PANEL_BLUR, 0, 32))
const lavenderArtworkBlur = ref(readNumber('lavender-artwork-blur', LAVENDER_ARTWORK_PANEL_BLUR, 0, 32))
const currentSlot = computed<BackgroundSlot>(() => separate.value ? (isDark.value ? 'dark' : 'light') : 'shared')

function imageOf(slot: BackgroundSlot): string {
  const background = slots[slot].value
  if (background.source === 'file') return fileUrls[slot]
  return background.source === 'url' ? background.value : ''
}

// The selected theme can supply artwork and its own priority setting.
const { theme } = useTheme()
const sakura = useSakura()
const pride = usePride()
const ink = useInk()
const lavender = useLavender()
const themeArtwork = computed(() => {
  if (theme.value === 'sakura' && sakura.artwork.value) return isDark.value ? sakuraNight : sakuraDay
  if (theme.value === 'pride' && pride.artwork.value) return isDark.value ? prideNight : prideDay
  if (theme.value === 'ink' && ink.artwork.current.value) return inkLandscape
  if (theme.value === 'lavender' && lavender.artwork.current.value) return isDark.value ? lavenderNight : lavenderDay
  return ''
})
const artworkFirst = computed(() => {
  if (theme.value === 'ink') return ink.artworkFirst.current.value
  if (theme.value === 'lavender') return lavender.artworkFirst.current.value
  if (theme.value === 'pride') return pride.artworkFirst.value
  return sakura.artworkFirst.value
})

const operatorImage = computed(() => imageOf(currentSlot.value))
// The picture on screen. Which of the two wins is the operator's choice.
const shownOperator = computed(() => {
  if (!enabled.value) return false
  if (!operatorImage.value) return false
  return !artworkFirst.value || themeArtwork.value === ''
})
const currentImage = computed(() => {
  if (!enabled.value) return ''
  return shownOperator.value ? operatorImage.value : themeArtwork.value
})
// The built-in artworks use a lower blur to keep their details visible.
const artworkBlur = computed(() => {
  if (!currentImage.value || shownOperator.value) return null
  if (theme.value === 'sakura') return { setting: sakuraArtworkBlur, fallback: SAKURA_ARTWORK_PANEL_BLUR, key: 'sakura-artwork-blur' }
  if (theme.value === 'pride') return { setting: prideArtworkBlur, fallback: PRIDE_ARTWORK_PANEL_BLUR, key: 'pride-artwork-blur' }
  if (theme.value === 'ink') return { setting: inkArtworkBlur, fallback: INK_ARTWORK_PANEL_BLUR, key: 'ink-artwork-blur' }
  if (theme.value === 'lavender') return { setting: lavenderArtworkBlur, fallback: LAVENDER_ARTWORK_PANEL_BLUR, key: 'lavender-artwork-blur' }
  return null
})
const panelBlur = computed(() => artworkBlur.value?.setting.value ?? sharedPanelBlur.value)
const defaultPanelBlur = computed(() => artworkBlur.value?.fallback ?? DEFAULT_PANEL_BLUR)
const showingInkArtwork = computed(() => enabled.value && !shownOperator.value && theme.value === 'ink' && themeArtwork.value !== '')
const showingLavenderArtwork = computed(() => enabled.value && !shownOperator.value && theme.value === 'lavender' && themeArtwork.value !== '')
const opacityPreference = computed(() => {
  if (showingInkArtwork.value) return { setting: inkArtworkOpacity, key: 'ink-artwork-opacity', fallback: INK_ARTWORK_PANEL_OPACITY }
  if (showingLavenderArtwork.value) return { setting: lavenderArtworkOpacity, key: 'lavender-artwork-opacity', fallback: DEFAULT_PANEL_OPACITY }
  return { setting: sharedOpacity, key: 'acrylic-opacity', fallback: DEFAULT_PANEL_OPACITY }
})
const opacity = computed(() => opacityPreference.value.setting.value ?? sharedOpacity.value)
const defaultOpacity = computed(() => opacityPreference.value.fallback)
// Something is saved or supplied, whether or not it is shown.
const hasSavedImage = computed(() => themeArtwork.value !== '' || SLOTS.some((slot) => slots[slot].value.source !== 'none'))
// With no image behind them the panels have nothing to show through, so they
// stay opaque. With one, they turn translucent: an image beside opaque panels
// looks broken.
const hasBackground = computed(() => enabled.value && (themeArtwork.value !== '' || SLOTS.some((slot) => imageOf(slot) !== '')))

function applyBackground(): void {
  const root = document.documentElement
  const image = currentImage.value
  root.style.setProperty('--custom-background-image', image ? `url("${image.replace(/["\\\n\r]/g, '\\$&')}")` : 'none')
  // The panels cover the whole window, so the only thing seen through them is
  // this one layer. Blurring it by both amounts looks like a blur on each panel
  // without a backdrop filter, which repaints on every streamed token. The
  // per-image blur belongs to the operator's picture, not to theme artwork.
  const imageBlur = shownOperator.value ? slots[currentSlot.value].value.blur : 0
  root.style.setProperty('--background-blur', `${imageBlur + (image ? panelBlur.value : 0)}px`)
  root.style.setProperty('--panel-blur', `${panelBlur.value}px`)
  root.dataset.background = image ? 'on' : 'off'
  root.toggleAttribute('data-ink-artwork', showingInkArtwork.value)
  root.toggleAttribute('data-lavender-artwork', showingLavenderArtwork.value)
  root.style.setProperty('--acrylic-opacity', `${opacity.value / 100}`)
}

function validate(next: BackgroundSettings): void {
  if (next.source !== 'url' || !next.value) return
  const url = new URL(next.value)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Background URL must use HTTP or HTTPS')
}

function setFileUrl(slot: BackgroundSlot, blob: Blob | null): void {
  if (fileUrls[slot]) URL.revokeObjectURL(fileUrls[slot])
  fileUrls[slot] = blob ? URL.createObjectURL(blob) : ''
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
  if (next.source !== 'file') {
    setFileUrl(slot, null)
    void deleteBlob(`background-${slot}`).catch(() => undefined)
  }
  slots[slot].value = next
  applyBackground()
  return true
}

watch([currentImage, currentSlot, opacity, panelBlur, showingInkArtwork, showingLavenderArtwork, () => slots[currentSlot.value].value.blur], applyBackground, { immediate: true })

export function useAppearance() {
  return {
    separate,
    slots,
    opacity,
    defaultOpacity,
    panelBlur,
    defaultPanelBlur,
    hasBackground,
    hasSavedImage,
    enabled,
    showingLavenderArtwork,
    setEnabled(value: boolean) {
      enabled.value = value
      savePreference('background-enabled', value ? 'on' : 'off')
    },
    /** The address the browser loads for this slot, or an empty string. */
    imageOf,
    setSeparate(value: boolean) {
      separate.value = value
      savePreference('background-separate', value ? 'on' : 'off')
    },
    setOpacity(value: number) {
      const next = Math.min(95, Math.max(50, value))
      const { setting, key } = opacityPreference.value
      setting.value = next
      savePreference(key, String(next))
    },
    setPanelBlur(value: number) {
      const blur = Math.min(32, Math.max(0, value))
      const target = artworkBlur.value
      const preference = target?.setting ?? sharedPanelBlur
      preference.value = blur
      savePreference(target?.key ?? 'acrylic-blur', String(blur))
    },
    setBackground(slot: BackgroundSlot, patch: Partial<BackgroundSettings>): boolean {
      const next = { ...slots[slot].value, ...patch }
      validate(next)
      return store(slot, next)
    },
    async setFile(slot: BackgroundSlot, file: File): Promise<boolean> {
      if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) return false
      try {
        await saveBlob(`background-${slot}`, file)
      } catch {
        return false
      }
      const next: BackgroundSettings = { source: 'file', value: '', name: file.name, blur: slots[slot].value.blur }
      if (!store(slot, next)) return false
      setFileUrl(slot, file)
      return true
    },
    clearBackground(slot: BackgroundSlot) {
      store(slot, { ...EMPTY })
    },
  }
}

/** Reads the stored files back. Until they arrive the page shows no image. */
export async function initAppearance(): Promise<void> {
  applyBackground()
  await Promise.all(SLOTS.map(async (slot) => {
    if (slots[slot].value.source !== 'file') return
    try {
      const blob = await loadBlob(`background-${slot}`)
      if (blob) setFileUrl(slot, blob)
      else slots[slot].value = { ...EMPTY }
    } catch {
      slots[slot].value = { ...EMPTY }
    }
  }))
}
