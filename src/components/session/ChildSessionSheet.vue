<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowDown, ChevronRight, RefreshCw } from '@lucide/vue'
import { server } from '@/app/server'
import MarkdownView from '@/components/render/MarkdownView.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { useDisplayStyle } from '@/composables/display-style'
import { useStickToBottom } from '@/composables/stick-to-bottom'
import { t } from '@/i18n'
import { displayToken } from '@/session/display-case'
import type { ChildSummary } from '@/protocol/types'
import { groupToolBlocks, toBlocks } from '@/session/blocks'
import { childActivity, isChildActive } from '@/session/child-trace'
import { retryLine } from '@/session/progress'
import MessageBlock from './MessageBlock.vue'
import ReasoningBlock from './ReasoningBlock.vue'
import ToolBlock from './ToolBlock.vue'
import ToolGroup from './ToolGroup.vue'

const childId = defineModel<string | null>('childId', { required: true })

const model = server.model
const child = ref<ChildSummary | null>(null)
const loading = ref(false)
const failed = ref(false)

async function load(): Promise<void> {
  const id = childId.value
  if (!id) return
  loading.value = true
  failed.value = false
  const result = await server.loadChild(id)
  if (id !== childId.value) return
  child.value = result ?? null
  failed.value = result === undefined
  loading.value = false
  // The saved archive now covers everything the trace showed.
  if (result && !isChildActive(result.status)) model.dropChildTrace(id)
}

watch(childId, (id) => {
  child.value = null
  if (id) void load()
})

// The list entry changes as the child runs. Show its newest numbers at once,
// and read the archive again when it stops, because the server saves it then.
const entry = computed(() => model.children.find((item) => item.id === childId.value))
const trace = computed(() => (childId.value ? (model.childTraces.get(childId.value) ?? null) : null))
const summary = computed<ChildSummary | null>(() =>
  entry.value && child.value ? { ...child.value, ...entry.value, archive: child.value.archive } : child.value,
)
const running = computed(() => (entry.value ? isChildActive(entry.value.status) : false))
const activity = computed(() => childActivity(trace.value))

watch(
  () => entry.value?.status,
  (status, before) => {
    if (status && before && isChildActive(before) && !isChildActive(status)) void load()
  },
)

// What the archive does not hold yet. Once the child has stopped and the
// archive is fresh, the trace repeats it, so it is hidden.
const showTrace = computed(() => trace.value !== null && (running.value || !child.value?.archive))
const { groupTools, groupSingleTool, quietTools } = useDisplayStyle()
const archiveBlocks = computed(() => groupToolBlocks(toBlocks(child.value?.archive ?? []), groupTools.value, groupSingleTool.value))
const traceBlocks = computed(() => groupToolBlocks(showTrace.value && trace.value ? toBlocks(trace.value.items) : [], groupTools.value, groupSingleTool.value))
const liveTools = computed(() =>
  groupToolBlocks((live.value?.toolCalls ?? []).map((call) => ({ kind: 'tool' as const, key: call.callId, call, result: null })), groupTools.value, groupSingleTool.value),
)
const live = computed(() => (showTrace.value ? (trace.value?.live ?? null) : null))
const retry = computed(() => {
  const current = live.value
  return current && current.retries > 0 ? retryLine(current.retries, current.retryMessage) : null
})
const hasContent = computed(
  () => archiveBlocks.value.length > 0 || traceBlocks.value.length > 0 || live.value !== null,
)

const { bind, pinned, onScroll, toBottom } = useStickToBottom(() => [
  archiveBlocks.value.length,
  traceBlocks.value.length,
  live.value?.text.length,
  live.value?.reasoning.length,
  live.value?.toolCalls.length,
  live.value?.retries,
])

// The server's thinking preference decides whether a reasoning block starts open.
const thinkingOpen = computed(() => model.preferences?.verboseThinking ?? false)

const number = new Intl.NumberFormat()

const activityText = computed(() => {
  const now = activity.value
  switch (now.kind) {
    case 'tool':
      return t('child.activity.tool', { name: now.name })
    case 'writing':
      return t('child.activity.writing')
    case 'thinking':
      return t('child.activity.thinking')
    case 'retrying': {
      const line = retryLine(now.count, now.message)
      return t(line.key, line.params)
    }
    default:
      return t('child.activity.waiting')
  }
})
</script>

<template>
  <Sheet :open="childId !== null" @update:open="(open) => !open && (childId = null)">
    <SheetContent side="right" class="w-full gap-0 sm:max-w-xl">
      <SheetHeader class="border-b pb-3">
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <SheetTitle class="truncate">{{ summary?.label || summary?.agent || t('child.title') }}</SheetTitle>
            <SheetDescription class="mt-1 flex flex-wrap items-center gap-2">
              <template v-if="summary">
                <Badge :variant="running ? 'outline' : 'secondary'" class="gap-1.5">
                  <Spinner v-if="running" class="size-3 motion-reduce:animate-none" />
                  {{ displayToken(summary.status) }}
                </Badge>
                <span class="font-mono text-xs">{{ summary.agent }}</span>
                <span class="text-xs tabular-nums">{{ t('panel.children.calls', { model: summary.modelCalls, tool: summary.toolCalls }) }}</span>
              </template>
            </SheetDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="mr-8 size-9 shrink-0"
            :disabled="loading"
            :title="t('child.refresh')"
            :aria-label="t('child.refresh')"
            @click="load"
          >
            <RefreshCw class="size-4" :class="loading ? 'animate-spin motion-reduce:animate-none' : ''" />
          </Button>
        </div>
        <p v-if="running" role="status" class="text-muted-foreground flex items-center gap-2 text-xs">{{ t('child.live') }}: {{ activityText }}</p>
        <details v-if="summary" class="text-muted-foreground group max-h-[40vh] overflow-y-auto text-xs">
          <summary class="hover:text-foreground flex cursor-pointer list-none items-center gap-1">
            <ChevronRight class="size-3.5 transition-transform group-open:rotate-90" />
            {{ t('child.details') }}
          </summary>
          <dl class="mt-2 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1">
            <template v-if="summary.model.model">
              <dt>{{ t('child.model') }}</dt>
              <dd class="min-w-0 wrap-anywhere">{{ [summary.model.provider, summary.model.model, summary.model.thinking].filter(Boolean).join(' · ') }}</dd>
            </template>
            <template v-if="summary.tools.length">
              <dt>{{ t('child.tools') }}</dt>
              <dd class="max-h-32 min-w-0 overflow-y-auto font-mono wrap-anywhere" tabindex="0">{{ summary.tools.join(', ') }}</dd>
            </template>
            <template v-if="summary.cumulativeUsage ?? summary.usage">
              <dt>{{ t('child.usage') }}</dt>
              <dd class="tabular-nums">
                {{ number.format((summary.cumulativeUsage ?? summary.usage)!.inputTokens) }} IN /
                {{ number.format((summary.cumulativeUsage ?? summary.usage)!.outputTokens) }} OUT
              </dd>
            </template>
            <dt>{{ t('session.id') }}</dt>
            <dd class="min-w-0 font-mono break-all select-text">{{ childId }}</dd>
          </dl>
        </details>
      </SheetHeader>

      <div class="relative min-h-0 flex-1">
        <div :ref="bind" class="h-full space-y-5 overflow-x-hidden overflow-y-auto px-4 py-4" tabindex="0" @scroll.passive="onScroll">
          <p v-if="loading && !child?.archive" class="text-muted-foreground text-sm">{{ t('child.loading') }}</p>
          <p v-else-if="failed" role="alert" class="text-destructive text-sm">{{ t('child.failed') }}</p>
          <p v-else-if="child && !hasContent && !running" class="text-muted-foreground text-sm">{{ t('child.empty') }}</p>

          <template v-for="block in archiveBlocks" :key="block.key">
            <MessageBlock v-if="block.kind === 'message'" :role="block.role" :text="block.text" :images="block.images" />
            <ReasoningBlock v-else-if="block.kind === 'reasoning'" :text="block.text" :default-open="thinkingOpen" :folded="false" />
            <ToolGroup v-else-if="block.kind === 'toolgroup'" :calls="block.calls" />
            <ToolBlock v-else-if="block.kind === 'tool'" :call="block.call" :result="block.result" :quiet="quietTools" />
          </template>

          <template v-if="showTrace">
            <p v-if="archiveBlocks.length" class="text-muted-foreground border-t pt-3 text-xs font-medium">{{ t('child.live') }}</p>
            <p v-if="trace && !trace.complete" class="text-muted-foreground text-xs">{{ t('child.partial') }}</p>

            <template v-for="block in traceBlocks" :key="block.key">
              <MessageBlock v-if="block.kind === 'message'" :role="block.role" :text="block.text" :images="block.images" />
              <ReasoningBlock v-else-if="block.kind === 'reasoning'" :text="block.text" :default-open="thinkingOpen" :folded="false" />
              <ToolGroup v-else-if="block.kind === 'toolgroup'" :calls="block.calls" />
              <ToolBlock v-else-if="block.kind === 'tool'" :call="block.call" :result="block.result" :running="block.result === null && running" :quiet="quietTools" />
            </template>

            <template v-if="live">
              <ReasoningBlock v-if="live.reasoning" :text="live.reasoning" streaming :default-open="thinkingOpen" :folded="false" />
              <section v-if="live.text" class="mr-4"><MarkdownView :source="live.text" streaming /></section>
              <template v-for="entry in liveTools" :key="entry.key">
                <ToolGroup v-if="entry.kind === 'toolgroup'" :calls="entry.calls" />
                <ToolBlock v-else-if="entry.kind === 'tool'" :call="entry.call" :result="null" running :quiet="quietTools" />
              </template>
              <p v-if="retry" class="text-muted-foreground text-sm wrap-anywhere whitespace-pre-wrap">{{ t(retry.key, retry.params) }}</p>
            </template>

            <div v-if="trace?.errors.length" role="alert" class="border-destructive/40 text-destructive space-y-1 rounded-lg border px-3 py-2 text-sm">
              <p v-for="(text, index) in trace.errors" :key="index" class="wrap-anywhere whitespace-pre-wrap">{{ text }}</p>
            </div>
          </template>

          <section v-if="summary?.todos.length">
            <h3 class="mb-1 text-sm font-medium">{{ t('child.tasks') }}</h3>
            <ul class="space-y-1 text-sm">
              <li v-for="todo in summary.todos" :key="todo.id" class="flex gap-2">
                <span class="text-muted-foreground w-24 shrink-0 text-xs leading-5">{{ displayToken(todo.status) }}</span>
                <span class="min-w-0 wrap-anywhere">{{ todo.content }}</span>
              </li>
            </ul>
          </section>
          <section v-if="summary?.notes.length" class="bg-card rounded-lg border px-3 py-2">
            <h3 class="mb-1 text-sm font-medium">{{ t('child.notes') }}</h3>
            <ul class="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
              <li v-for="(note, index) in summary.notes" :key="index" class="wrap-anywhere">{{ note }}</li>
            </ul>
          </section>
        </div>
        <Button
          v-if="!pinned && running"
          variant="secondary"
          size="sm"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md"
          @click="toBottom"
        >
          <ArrowDown class="size-4" />
          {{ t('session.jump') }}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
