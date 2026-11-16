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
import { compactionSummary, groupToolBlocks, toBlocks } from '@/session/blocks'
import { retryLine } from '@/session/progress'
import ReportBlock from '@/components/report/ReportBlock.vue'
import MessageBlock from './MessageBlock.vue'
import ReasoningBlock from './ReasoningBlock.vue'
import SummaryCard from './SummaryCard.vue'
import ToolBlock from './ToolBlock.vue'
import ToolGroup from './ToolGroup.vue'

const model = server.model
const { fullWidth } = useConversationWidth()
const blocks = computed(() => toBlocks(model.conversation, model.notices))
const live = computed(() => model.live)
const { groupTools, foldThinking } = useDisplayStyle()

const entries = computed(() => groupToolBlocks(blocks.value, groupTools.value))
const liveEntries = computed(() =>
  groupToolBlocks(
    (live.value?.toolCalls ?? []).map((call) => ({ kind: 'tool' as const, key: call.callId, call, result: null })),
    groupTools.value,
  ),
)
const retry = computed(() => {
  const current = live.value
  return current && current.retries > 0 ? retryLine(current.retries, current.retryMessage) : null
})
const pending = computed(() => model.notices.filter((notice) => notice.at === null))
const thinkingOpen = computed(() => model.preferences?.verboseThinking ?? false)

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

// Thinking before the newest thinking block folds, unless the reader opened it.
const lastReasoningKey = computed(() => [...blocks.value].reverse().find((b) => b.kind === 'reasoning')?.key ?? null)
const foldedReasoning = (key: string) => foldThinking.value && (!!live.value?.reasoning || key !== lastReasoningKey.value)

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
const enter = computed(() => (settled.value ? 'block-enter' : ''))

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
          <MessageBlock v-if="block.kind === 'message'" :role="block.role" :text="block.text" :images="block.images" />

          <ToolGroup v-else-if="block.kind === 'toolgroup'" :calls="block.calls" />

          <SummaryCard v-else-if="block.kind === 'summary'" :text="block.text" />

          <ReasoningBlock v-else-if="block.kind === 'reasoning'" :text="block.text" :default-open="thinkingOpen" :folded="foldedReasoning(block.key)" />

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

          <ToolBlock v-else :call="block.call" :result="block.result" />
        </div>

        <template v-if="live">
          <ReasoningBlock v-if="live.reasoning" :text="live.reasoning" streaming :default-open="thinkingOpen" :folded="false" />
          <section v-if="live.text" class="mr-4">
            <MarkdownView :source="live.text" streaming />
          </section>
          <template v-for="entry in liveEntries" :key="entry.key">
            <ToolGroup v-if="entry.kind === 'toolgroup'" :calls="entry.calls" />
            <ToolBlock v-else-if="entry.kind === 'tool'" :call="entry.call" :result="null" running />
          </template>
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
