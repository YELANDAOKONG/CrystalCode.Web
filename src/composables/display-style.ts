import { computed, ref } from 'vue'
import { loadPreference, savePreference } from '@/connection/storage'

// The defaults are the compact look. The earlier, more literal layout is one
// choice away: cards for tool calls, nothing opened or folded for the reader.
//
// How tool calls are listed: one card each; two or more in a row folded into a
// group while a single call stays a card; the same with a single call as a
// quiet line; or a single call also as a group of one.
const TOOL_FOLDINGS = ['each', 'group', 'line', 'single-group'] as const
export type ToolFolding = (typeof TOOL_FOLDINGS)[number]
const stored = loadPreference('tool-grouping')
const toolFolding = ref<ToolFolding>(TOOL_FOLDINGS.find((value) => value === stored) ?? 'single-group')
const groupTools = computed(() => toolFolding.value !== 'each')
const quietTools = computed(() => toolFolding.value === 'line')
const groupSingleTool = computed(() => toolFolding.value === 'single-group')
const foldTools = ref(loadPreference('tool-latest') !== 'keep')
const foldThinking = ref(loadPreference('thinking-fold') !== 'keep')
// Off by default: it hides the most, so the reader turns it on.
const foldRuns = ref(loadPreference('run-fold') === 'fold')
const fadeIn = ref(loadPreference('block-fade') !== 'off')

export function useDisplayStyle() {
  return {
    toolFolding,
    groupTools,
    quietTools,
    groupSingleTool,
    foldTools,
    foldThinking,
    foldRuns,
    fadeIn,
    setToolFolding(value: ToolFolding) {
      toolFolding.value = value
      savePreference('tool-grouping', value)
    },
    setFoldTools(value: boolean) {
      foldTools.value = value
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
