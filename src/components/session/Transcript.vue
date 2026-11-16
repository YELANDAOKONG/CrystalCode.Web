<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowDown, CircleAlert } from '@lucide/vue'
import { server } from '@/app/server'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import LogoMark from '@/components/common/LogoMark.vue'
import MarkdownView from '@/components/render/MarkdownView.vue'
import { useStickToBottom } from '@/composables/stick-to-bottom'
import { useConversationWidth } from '@/composables/conversation-width'
import { useDisplayStyle } from '@/composables/display-style'
import { t } from '@/i18n'
import { compactionSummary, foldRuns, groupToolBlocks, toBlocks, type Block, type FoldedBlock } from '@/session/blocks'
import { retryLine } from '@/session/progress'
import ReportBlock from '@/components/report/ReportBlock.vue'
import MessageBlock from './MessageBlock.vue'
import ProcessGroup from './ProcessGroup.vue'
import SummaryCard from './SummaryCard.vue'
import StepView from './StepView.vue'

const model = server.model
const { fullWidth } = useConversationWidth()
const blocks = computed(() => toBlocks(model.conversation, model.notices))
const live = computed(() => model.live)
const { groupTools, groupSingleTool, foldRuns: foldRunsSetting, fadeIn } = useDisplayStyle()

// The round still streaming is drawn with the saved blocks, so a run of
// thinking and tool calls folds as one whether or not it has finished.
const liveBlocks = computed<Block[]>(() => {
  const current = live.value
  if (!current) return []
  const list: Block[] = []
  if (current.reasoning) list.push({ kind: 'reasoning', key: 'live-reasoning', text: current.reasoning, streaming: true })
  if (current.text) list.push({ kind: 'message', key: 'live-text', role: 'assistant', text: current.text, images: [], streaming: true })
  for (const call of current.toolCalls) list.push({ kind: 'tool', key: `live-${call.callId}`, call, result: null, running: true })
  return list
})
const entries = computed(() => foldRuns(groupToolBlocks([...blocks.value, ...liveBlocks.value], groupTools.value, groupSingleTool.value), foldRunsSetting.value))
const retry = computed(() => {
  const current = live.value
  return current && current.retries > 0 ? retryLine(current.retries, current.retryMessage) : null
})
const pending = computed(() => model.notices.filter((notice) => notice.at === null))

// Stick to the bottom only while the reader is already there. Once they scroll
// up, streaming text must not pull them back down.
const { bind, pinned, unseen, onScroll, toBottom } = useStickToBottom(() => [
  blocks.value.length,
  live.value?.text.length,
  live.value?.reasoning.length,
  live.value?.toolCalls.length,
  live.value?.retries,
  model.notices.length,
  fullWidth.value,
])

// The newest thinking block, tool call, and run stay open and earlier ones
// close, unless the reader opened them.
const latest = computed(() => {
  const result = { reasoning: null as string | null, tool: null as string | null, run: null as string | null }
  const visit = (entry: FoldedBlock) => {
    if (entry.kind === 'process') entry.steps.forEach(visit)
    else if (entry.kind === 'reasoning') result.reasoning = entry.key
    else if (entry.kind === 'tool' || entry.kind === 'toolgroup') result.tool = entry.key
  }
  for (const entry of entries.value) {
    visit(entry)
    if (entry.kind === 'process' || entry.kind === 'reasoning' || entry.kind === 'tool' || entry.kind === 'toolgroup') result.run = entry.key
  }
  return result
})

// Blocks that were there when the page finished loading do not animate.
const settled = ref(false)
watch(
  () => model.loaded,
  (loaded) => {
    if (loaded) requestAnimationFrame(() => (settled.value = true))
    else settled.value = false
  },
  { immediate: true },
)
// The live round does not fade as it streams in, only when it is saved.
const enter = computed(() => (settled.value && fadeIn.value && !live.value ? 'block-enter' : ''))

const isEmpty = computed(() => model.loaded && blocks.value.length === 0 && !live.value && model.notices.length === 0)

</script>

<template>
  <!-- The scroller is pinned to this slot. A percentage height resolves
       against the content once a sibling such as the progress row changes
       size, which stretches the column and traps the scroll position. -->
  <div class="relative min-h-0 flex-1 overflow-hidden">
    <div :ref="bind" class="absolute inset-0 overflow-y-auto [overflow-anchor:none]" tabindex="0" :aria-label="t('session.transcript')" @scroll.passive="onScroll">
      <div class="mx-auto flex flex-col gap-5 px-4 py-6" :class="fullWidth ? 'md:px-8 lg:px-12' : 'max-w-3xl'">
        <p v-if="!model.loaded" class="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
          <Spinner />
          {{ t('session.loading') }}
        </p>
        <div v-else-if="isEmpty" class="flex flex-col items-center gap-3 py-16">
          <LogoMark class="text-muted-foreground size-8" />
          <p class="text-muted-foreground text-center text-sm">{{ t('session.empty') }}</p>
        </div>

        <div v-for="block in entries" :key="block.key" class="flex min-w-0 flex-col" :class="enter">
          <section v-if="block.kind === 'message' && block.streaming" class="mr-4">
            <MarkdownView :source="block.text" streaming />
          </section>
          <MessageBlock v-else-if="block.kind === 'message'" :role="block.role" :text="block.text" :images="block.images" />

          <ProcessGroup v-else-if="block.kind === 'process'" :thinking="block.thinking" :tools="block.tools" :default-open="block.key === latest.run">
            <StepView v-for="step in block.steps" :key="step.key" :step="step" :latest-reasoning="latest.reasoning" :latest-tool="latest.tool" />
          </ProcessGroup>

          <StepView
            v-else-if="block.kind === 'toolgroup' || block.kind === 'reasoning' || block.kind === 'tool'"
            :step="block"
            :latest-reasoning="latest.reasoning"
            :latest-tool="latest.tool"
          />

          <SummaryCard v-else-if="block.kind === 'summary'" :text="block.text" />

          <template v-else-if="block.kind === 'notice'">
            <div
              v-if="block.notice.kind === 'error'"
              role="alert"
              class="border-destructive/40 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <CircleAlert class="mt-0.5 size-4 shrink-0" />
              <span class="whitespace-pre-wrap"><strong>{{ t('session.notice.error') }}</strong> {{ block.notice.text }}</span>
            </div>
            <template v-else-if="block.notice.kind === 'note'">
              <SummaryCard v-if="compactionSummary(block.notice.text) !== null" :text="compactionSummary(block.notice.text)!" />
              <p v-else class="text-muted-foreground text-sm whitespace-pre-wrap">{{ block.notice.text }}</p>
            </template>
            <ReportBlock v-else :notice="block.notice" />
          </template>
        </div>

        <template v-if="live">
          <p v-if="retry" class="text-muted-foreground text-sm break-words whitespace-pre-wrap">{{ t(retry.key, retry.params) }}</p>
        </template>

        <template v-for="notice in pending" :key="notice.seq">
          <div
            v-if="notice.kind === 'error'"
            role="alert"
            class="border-destructive/40 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <CircleAlert class="mt-0.5 size-4 shrink-0" />
            <span class="whitespace-pre-wrap"><strong>{{ t('session.notice.error') }}</strong> {{ notice.text }}</span>
          </div>
          <template v-else-if="notice.kind === 'note'">
            <SummaryCard v-if="compactionSummary(notice.text) !== null" :text="compactionSummary(notice.text)!" />
            <p v-else class="text-muted-foreground text-sm whitespace-pre-wrap">{{ notice.text }}</p>
          </template>
          <ReportBlock v-else :notice="notice" />
        </template>

      </div>
    </div>
    <Button
      v-if="!pinned"
      variant="secondary"
      size="sm"
      class="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md"
      @click="toBottom"
    >
      <ArrowDown class="size-4" />
      {{ unseen > 0 && live ? t('session.jump.new') : t('session.jump') }}
    </Button>
  </div>
</template>
