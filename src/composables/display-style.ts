import { computed, ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'

// How tool calls are listed: one card each, two or more in a row folded into a
// line, or every call folded, even a single one.
export type ToolFolding = 'each' | 'group' | 'all'

// The defaults are the compact look. The earlier, more literal layout is one
// choice away: cards for tool calls, nothing opened or folded for the reader.
const stored = loadPreference('tool-grouping')
const toolFolding = ref<ToolFolding>(stored === 'each' || stored === 'group' ? stored : 'all')
const groupTools = computed(() => toolFolding.value !== 'each')
const quietTools = computed(() => toolFolding.value === 'all')
const openLatestTool = ref(loadPreference('tool-latest') !== 'keep')
const foldThinking = ref(loadPreference('thinking-fold') !== 'keep')
// Off by default: it hides the most, so the reader turns it on.
const foldRuns = ref(loadPreference('run-fold') === 'fold')
const fadeIn = ref(loadPreference('block-fade') !== 'off')

export function useDisplayStyle() {
  return {
    toolFolding,
    groupTools,
    quietTools,
    openLatestTool,
    foldThinking,
    foldRuns,
    fadeIn,
    setToolFolding(value: ToolFolding) {
      toolFolding.value = value
      savePreference('tool-grouping', value)
    },
    setOpenLatestTool(value: boolean) {
      openLatestTool.value = value
      savePreference('tool-latest', value ? 'open' : 'keep')
    },
    setFoldRuns(value: boolean) {
      foldRuns.value = value
      savePreference('run-fold', value ? 'fold' : 'keep')
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
