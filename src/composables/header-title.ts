import { ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'

export type HeaderTitleSetting = 'topic' | 'workspace'

const setting = ref<HeaderTitleSetting>(loadPreference('header-title') === 'workspace' ? 'workspace' : 'topic')

export function useHeaderTitleSetting() {
  return {
    headerTitle: setting,
    setHeaderTitle(next: HeaderTitleSetting) {
      setting.value = next
      savePreference('header-title', next)
    },
  }
}
