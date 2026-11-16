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
// How runs of thinking and tool steps between two messages are listed: every
// step, folded with the newest run folding once the turn ends, or folded with
// the newest run always open.
const RUN_FOLDINGS = ['off', 'done', 'newest'] as const
export type RunFolding = (typeof RUN_FOLDINGS)[number]
const storedRuns = loadPreference('run-fold')
const runFolding = ref<RunFolding>(
  RUN_FOLDINGS.find((value) => value === storedRuns) ?? (storedRuns === 'fold' ? 'newest' : storedRuns === 'keep' ? 'off' : 'done'),
)
const foldRuns = computed(() => runFolding.value !== 'off')
const keepNewestRun = computed(() => runFolding.value === 'newest')
const fadeIn = ref(loadPreference('block-fade') !== 'off')

export function useDisplayStyle() {
  return {
    toolFolding,
    groupTools,
    quietTools,
    groupSingleTool,
    foldTools,
    foldThinking,
    runFolding,
    foldRuns,
    keepNewestRun,
    fadeIn,
    setToolFolding(value: ToolFolding) {
      toolFolding.value = value
      savePreference('tool-grouping', value)
    },
    setFoldTools(value: boolean) {
      foldTools.value = value
      savePreference('tool-latest', value ? 'open' : 'keep')
    },
    setRunFolding(value: RunFolding) {
      runFolding.value = value
      savePreference('run-fold', value)
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
