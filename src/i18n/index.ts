import { ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'
import { en, type MessageKey } from './en'
import { zhCn } from './zh-cn'
import { zhTw } from './zh-tw'

export type Locale = 'en' | 'zh-cn' | 'zh-tw'

export const LOCALES: { id: Locale; label: string; htmlLang: string }[] = [
  { id: 'en', label: 'English', htmlLang: 'en' },
  { id: 'zh-cn', label: '简体中文', htmlLang: 'zh-CN' },
  { id: 'zh-tw', label: '繁體中文', htmlLang: 'zh-TW' },
]

const tables: Record<Locale, Partial<Record<MessageKey, string>>> = { en, 'zh-cn': zhCn, 'zh-tw': zhTw }

const locale = ref<Locale>('en')

function detect(): Locale {
  for (const language of navigator.languages) {
    const lower = language.toLowerCase()
    if (lower.startsWith('zh')) {
      return /^zh-(tw|hk|mo|hant)/.test(lower) ? 'zh-tw' : 'zh-cn'
    }

    if (lower.startsWith('en')) return 'en'
  }

  return 'en'
}

function reflect(): void {
  const entry = LOCALES.find((item) => item.id === locale.value)
  document.documentElement.lang = entry?.htmlLang ?? 'en'
}

export function initI18n(): void {
  const saved = loadPreference('locale')
  locale.value = LOCALES.some((item) => item.id === saved) ? (saved as Locale) : detect()
  reflect()
}

export function setLocale(next: Locale): void {
  locale.value = next
  savePreference('locale', next)
  reflect()
}

/** Looks up a message, falls back to English, and fills `{name}` placeholders. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template = tables[locale.value][key] ?? en[key]
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`))
}

export function useLocale() {
  return { locale, setLocale, locales: LOCALES }
}

export type { MessageKey }
