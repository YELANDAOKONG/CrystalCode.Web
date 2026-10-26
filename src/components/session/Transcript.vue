<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, Brain, ChevronRight, CircleAlert } from '@lucide/vue'
import { server } from '@/app/server'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import MarkdownView from '@/components/render/MarkdownView.vue'
import { useStickToBottom } from '@/composables/stick-to-bottom'
import { t } from '@/i18n'
import { compactionSummary, toBlocks } from '@/session/blocks'
import ReportBlock from '@/components/report/ReportBlock.vue'
import ServerImage from './ServerImage.vue'
import SummaryCard from './SummaryCard.vue'
import ToolBlock from './ToolBlock.vue'

const model = server.model
const blocks = computed(() => toBlocks(model.conversation, model.notices))
const live = computed(() => model.live)
const pending = computed(() => model.notices.filter((notice) => notice.at === null))
const thinkingOpen = computed(() => model.preferences?.verboseThinking ?? false)

// Stick to the bottom only while the reader is already there. Once they scroll
// up, streaming text must not pull them back down.
const { bind, pinned, onScroll, toBottom } = useStickToBottom(() => [
  blocks.value.length,
  live.value?.text.length,
  live.value?.reasoning.length,
  live.value?.toolCalls.length,
  model.notices.length,
])

const roleLabel = (role: string) =>
  role === 'user' ? t('session.role.user') : role === 'assistant' ? t('session.role.assistant') : t('session.role.system')

const isEmpty = computed(() => model.loaded && blocks.value.length === 0 && !live.value && model.notices.length === 0)

</script>

<template>
  <div class="relative min-h-0 flex-1">
    <div :ref="bind" class="h-full overflow-y-auto" tabindex="0" :aria-label="t('session.transcript')" @scroll.passive="onScroll">
      <div class="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <p v-if="!model.loaded" class="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
          <Spinner />
          {{ t('session.loading') }}
        </p>
        <p v-else-if="isEmpty" class="text-muted-foreground py-12 text-center text-sm">{{ t('session.empty') }}</p>

        <template v-for="block in blocks" :key="block.key">
          <section
            v-if="block.kind === 'message'"
            class="rounded-xl px-4 py-3"
            :class="block.role === 'user' ? 'bg-secondary ml-8 self-end' : 'mr-4'"
          >
            <div class="text-muted-foreground mb-1 text-xs font-medium">{{ roleLabel(block.role) }}</div>
            <MarkdownView v-if="block.role !== 'user'" :source="block.text" />
            <p v-else class="whitespace-pre-wrap">{{ block.text }}</p>
            <div v-if="block.images.length" class="mt-2 flex flex-wrap gap-2">
              <ServerImage v-for="number in block.images" :key="number" :number="number" />
            </div>
          </section>

          <SummaryCard v-else-if="block.kind === 'summary'" :text="block.text" />

          <details v-else-if="block.kind === 'reasoning'" class="group text-sm" :open="thinkingOpen">
            <summary class="text-muted-foreground flex cursor-pointer list-none items-center gap-2">
              <ChevronRight class="size-4 transition-transform group-open:rotate-90" />
              <Brain class="size-4" />
              {{ t('session.reasoning') }}
            </summary>
            <div class="text-muted-foreground mt-1 border-l-2 pl-4"><MarkdownView :source="block.text" /></div>
          </details>

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
          <details v-if="live.reasoning" class="group text-sm" :open="thinkingOpen">
            <summary class="text-muted-foreground flex cursor-pointer list-none items-center gap-2">
              <ChevronRight class="size-4 transition-transform group-open:rotate-90" />
              <Brain class="size-4" />
              {{ t('session.reasoning') }}
            </summary>
            <div class="text-muted-foreground mt-1 border-l-2 pl-4"><MarkdownView :source="live.reasoning" streaming /></div>
          </details>
          <section v-if="live.text" class="mr-4 px-4 py-3">
            <div class="text-muted-foreground mb-1 text-xs font-medium">{{ t('session.role.assistant') }}</div>
            <MarkdownView :source="live.text" streaming />
          </section>
          <ToolBlock v-for="call in live.toolCalls" :key="call.callId" :call="call" :result="null" running />
          <p v-if="live.retries > 0" class="text-muted-foreground text-sm">{{ t('session.retrying', { count: live.retries }) }}</p>
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
