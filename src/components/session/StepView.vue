<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { useDisplayStyle } from '@/composables/display-style'
import type { StepBlock } from '@/session/blocks'
import ReasoningBlock from './ReasoningBlock.vue'
import ToolBlock from './ToolBlock.vue'
import ToolGroup from './ToolGroup.vue'

// One thinking block, tool call, or group of calls in the main transcript. The
// newest of each kind stays open and earlier ones close, when the reader's
// settings say so.
const props = defineProps<{
  step: StepBlock
  latestReasoning: string | null
  latestTool: string | null
}>()

const { foldThinking, openLatestTool, quietTools } = useDisplayStyle()
const thinkingOpen = computed(() => server.model.preferences?.verboseThinking ?? false)
const toolOpen = computed(() => openLatestTool.value && props.step.key === props.latestTool)
</script>

<template>
  <ReasoningBlock
    v-if="step.kind === 'reasoning'"
    :text="step.text"
    :streaming="step.streaming"
    :default-open="thinkingOpen"
    :folded="foldThinking && step.key !== latestReasoning"
  />
  <ToolGroup v-else-if="step.kind === 'toolgroup'" :calls="step.calls" :default-open="toolOpen" />
  <ToolBlock v-else :call="step.call" :result="step.result" :running="step.running" :quiet="quietTools" :default-open="toolOpen" />
</template>
