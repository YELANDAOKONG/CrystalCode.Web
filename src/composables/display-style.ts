import { ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'

// Both defaults are the compact look. Turning a switch off gives back the
// earlier, more literal layout: one card per tool call, every thinking block
// left as it was opened.
const groupTools = ref(loadPreference('tool-grouping') !== 'each')
const foldThinking = ref(loadPreference('thinking-fold') !== 'keep')
const fadeIn = ref(loadPreference('block-fade') !== 'off')

export function useDisplayStyle() {
  return {
    groupTools,
    foldThinking,
    fadeIn,
    setGroupTools(value: boolean) {
      groupTools.value = value
      savePreference('tool-grouping', value ? 'group' : 'each')
    },
    setFadeIn(value: boolean) {
      fadeIn.value = value
      savePreference('block-fade', value ? 'on' : 'off')
    },
    setFoldThinking(value: boolean) {
      foldThinking.value = value
      savePreference('thinking-fold', value ? 'fold' : 'keep')
    },
  }
}
