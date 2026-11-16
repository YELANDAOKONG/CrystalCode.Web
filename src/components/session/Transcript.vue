<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, Check, CircleAlert, Copy } from '@lucide/vue'
import { server } from '@/app/server'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import LogoMark from '@/components/common/LogoMark.vue'
import MarkdownView from '@/components/render/MarkdownView.vue'
import { useStickToBottom } from '@/composables/stick-to-bottom'
import { useConversationWidth } from '@/composables/conversation-width'
import { useDisplayStyle } from '@/composables/display-style'
import { t } from '@/i18n'
import { compactionSummary, toBlocks, type Block } from '@/session/blocks'
import { retryLine } from '@/session/progress'
import ReportBlock from '@/components/report/ReportBlock.vue'
import ReasoningBlock from './ReasoningBlock.vue'
import ServerImage from './ServerImage.vue'
import SummaryCard from './SummaryCard.vue'
import ToolBlock from './ToolBlock.vue'
import ToolGroup from './ToolGroup.vue'

const model = server.model
const { fullWidth } = useConversationWidth()
const blocks = computed(() => toBlocks(model.conversation, model.notices))
const live = computed(() => model.live)
const { groupTools, foldThinking } = useDisplayStyle()

type ToolEntry = Extract<Block, { kind: 'tool' }>
type Entry = Block | { kind: 'toolgroup'; key: string; calls: ToolEntry[] }

// Two or more tool calls in a row collapse into one line. A single call keeps
// its own row, and turning the setting off leaves every call as its own card.
function grouped(list: Block[]): Entry[] {
  if (!groupTools.value) return list
  const entries: Entry[] = []
  for (const block of list) {
    const last = entries[entries.length - 1]
    if (block.kind !== 'tool') {
      entries.push(block)
    } else if (last?.kind === 'toolgroup') {
      last.calls.push(block)
    } else if (last?.kind === 'tool') {
      entries[entries.length - 1] = { kind: 'toolgroup', key: `g${last.key}`, calls: [last, block] }
    } else {
      entries.push(block)
    }
  }
  return entries
}

const entries = computed(() => grouped(blocks.value))
const liveEntries = computed(() =>
  grouped((live.value?.toolCalls ?? []).map((call) => ({ kind: 'tool' as const, key: call.callId, call, result: null }))),
)

const copiedKey = ref<string | null>(null)
async function copyMessage(key: string, text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = null
    }, 1500)
  } catch {
    // Clipboard access can be denied on an insecure page. The text stays selectable.
  }
}
const retry = computed(() => {
  const current = live.value
  return current && current.retries > 0 ? retryLine(current.retries, current.retryMessage) : null
})
const pending = computed(() => model.notices.filter((notice) => notice.at === null))
const thinkingOpen = computed(() => model.preferences?.verboseThinking ?? false)

// Stick to the bottom only while the reader is already there. Once they scroll
// up, streaming text must not pull them back down.
const { bind, pinned, onScroll, toBottom } = useStickToBottom(() => [
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

const isEmpty = computed(() => model.loaded && blocks.value.length === 0 && !live.value && model.notices.length === 0)

</script>

<template>
  <!-- The scroller is pinned to this slot. A percentage height resolves
       against the content once a sibling such as the progress row changes
       size, which stretches the column and traps the scroll position. -->
  <div class="relative min-h-0 flex-1 overflow-hidden">
    <div :ref="bind" class="absolute inset-0 overflow-y-auto [overflow-anchor:none]" tabindex="0" :aria-label="t('session.transcript')" @scroll.passive="onScroll">
      <div class="mx-auto flex flex-col gap-5 px-4 py-6" :class="fullWidth ? '' : 'max-w-3xl'">
        <p v-if="!model.loaded" class="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
          <Spinner />
          {{ t('session.loading') }}
        </p>
        <div v-else-if="isEmpty" class="flex flex-col items-center gap-3 py-16">
          <LogoMark class="text-muted-foreground size-8" />
          <p class="text-muted-foreground text-center text-sm">{{ t('session.empty') }}</p>
        </div>

        <template v-for="block in entries" :key="block.key">
          <section
            v-if="block.kind === 'message'"
            class="group/message relative min-w-0"
            :class="block.role === 'user' ? 'max-w-[85%] self-end' : 'mr-4'"
          >
            <div v-if="block.role === 'user'" class="bg-secondary rounded-2xl px-4 py-2.5">
              <p class="whitespace-pre-wrap">{{ block.text }}</p>
            </div>
            <MarkdownView v-else :source="block.text" />
            <div v-if="block.images.length" class="mt-2 flex flex-wrap gap-2">
              <ServerImage v-for="number in block.images" :key="number" :number="number" />
            </div>
            <div
              v-if="block.text"
              class="absolute top-full left-0 flex h-5 opacity-0 transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100 [@media(hover:none)]:static [@media(hover:none)]:mt-1 [@media(hover:none)]:h-auto [@media(hover:none)]:opacity-100"
              :class="block.role === 'user' ? 'right-0 left-auto justify-end' : '-ml-2'"
            >
              <Button variant="ghost" size="sm" class="text-muted-foreground h-5 px-2 text-xs [@media(hover:none)]:h-7" @click="copyMessage(block.key, block.text)">
                <Check v-if="copiedKey === block.key" class="size-3.5" />
                <Copy v-else class="size-3.5" />
                {{ copiedKey === block.key ? t('common.copied') : t('common.copy') }}
              </Button>
            </div>
          </section>

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
        </template>

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
      {{ t('session.jump') }}
    </Button>
  </div>
</template>
