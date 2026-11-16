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
// How earlier thinking blocks or tool calls close by themselves: not at all,
// all but the newest, or all of them once the turn ends.
const STEP_FOLDINGS = ['off', 'earlier', 'done'] as const
export type StepFolding = (typeof STEP_FOLDINGS)[number]
// A value the first build of run folding saved is read as `earlier`.
function loadStepFolding(name: string, legacyOn: string, legacyOff: string): StepFolding {
  const value = loadPreference(name)
  return STEP_FOLDINGS.find((mode) => mode === value) ?? (value === legacyOn || value === 'newest' ? 'earlier' : value === legacyOff ? 'off' : 'done')
}
const foldTools = ref<StepFolding>(loadStepFolding('tool-latest', 'open', 'keep'))
const foldThinking = ref<StepFolding>(loadStepFolding('thinking-fold', 'fold', 'keep'))
// Runs of thinking and tool steps between two messages fold the same three
// ways, with the newest run kept open under `earlier`.
const runFolding = ref<StepFolding>(loadStepFolding('run-fold', 'fold', 'keep'))
const foldRuns = computed(() => runFolding.value !== 'off')
const keepNewestRun = computed(() => runFolding.value === 'earlier')
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
    setFoldTools(value: StepFolding) {
      foldTools.value = value
      savePreference('tool-latest', value)
    },
    setRunFolding(value: StepFolding) {
      runFolding.value = value
      savePreference('run-fold', value)
    },
    setFadeIn(value: boolean) {
      fadeIn.value = value
      savePreference('block-fade', value ? 'on' : 'off')
    },
    setFoldThinking(value: StepFolding) {
      foldThinking.value = value
      savePreference('thinking-fold', value)
    },
  }
}
