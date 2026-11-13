import { ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'

export type TitleSetting = 'session' | 'fixed'

const setting = ref<TitleSetting>(loadPreference('page-title') === 'fixed' ? 'fixed' : 'session')

export function useTitleSetting() {
  return {
    titleSetting: setting,
    setTitleSetting(next: TitleSetting) {
      setting.value = next
      savePreference('page-title', next)
    },
  }
}
