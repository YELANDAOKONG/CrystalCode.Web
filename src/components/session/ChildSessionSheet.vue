<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowDown, RefreshCw } from '@lucide/vue'
import { server } from '@/app/server'
import MarkdownView from '@/components/render/MarkdownView.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { useStickToBottom } from '@/composables/stick-to-bottom'
import { t } from '@/i18n'
import { displayToken } from '@/session/display-case'
import type { ChildSummary } from '@/protocol/types'
import { toBlocks } from '@/session/blocks'
import { childActivity, isChildActive } from '@/session/child-trace'
import ToolBlock from './ToolBlock.vue'

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
const archiveBlocks = computed(() => toBlocks(child.value?.archive ?? []))
const traceBlocks = computed(() => (showTrace.value && trace.value ? toBlocks(trace.value.items) : []))
const live = computed(() => (showTrace.value ? (trace.value?.live ?? null) : null))
const hasContent = computed(
  () => archiveBlocks.value.length > 0 || traceBlocks.value.length > 0 || live.value !== null,
)

const { bind, pinned, onScroll, toBottom } = useStickToBottom(() => [
  archiveBlocks.value.length,
  traceBlocks.value.length,
  live.value?.text.length,
  live.value?.reasoning.length,
  live.value?.toolCalls.length,
])

const roleKey = (role: string) => (role === 'user' ? 'session.role.user' : 'session.role.assistant')
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
    default:
      return t('child.activity.waiting')
  }
})
</script>

<template>
  <Sheet :open="childId !== null" @update:open="(open) => !open && (childId = null)">
    <SheetContent side="right" class="w-full gap-0 sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{{ summary?.label || summary?.agent || t('child.title') }}</SheetTitle>
        <SheetDescription class="flex flex-wrap items-center gap-2">
          <template v-if="summary">
            <Badge variant="secondary">{{ displayToken(summary.status) }}</Badge>
            <span class="font-mono text-xs">{{ summary.agent }}</span>
          </template>
        </SheetDescription>
      </SheetHeader>

      <div class="relative min-h-0 flex-1">
        <div :ref="bind" class="h-full space-y-4 overflow-y-auto px-4 pb-6" tabindex="0" @scroll.passive="onScroll">
          <div v-if="summary" class="text-muted-foreground space-y-1 text-xs">
            <p v-if="summary.model.model">{{ t('child.model') }}: {{ [summary.model.provider, summary.model.model, summary.model.thinking].filter(Boolean).join(' · ') }}</p>
            <p v-if="summary.tools.length">{{ t('child.tools') }}: <span class="font-mono">{{ summary.tools.join(', ') }}</span></p>
            <p v-if="summary.cumulativeUsage ?? summary.usage">
              {{ t('child.usage') }}: {{ number.format((summary.cumulativeUsage ?? summary.usage)!.inputTokens) }} IN /
              {{ number.format((summary.cumulativeUsage ?? summary.usage)!.outputTokens) }} OUT
            </p>
            <p>{{ t('panel.children.calls', { model: summary.modelCalls, tool: summary.toolCalls }) }}</p>
          </div>

          <Button variant="outline" size="sm" :disabled="loading" @click="load">
            <RefreshCw class="size-3.5" :class="loading ? 'animate-spin' : ''" />
            {{ t('child.refresh') }}
          </Button>

          <p v-if="loading && !child?.archive" class="text-muted-foreground text-sm">{{ t('child.loading') }}</p>
          <p v-else-if="failed" role="alert" class="text-destructive text-sm">{{ t('child.failed') }}</p>
          <p v-else-if="child && !hasContent && !running" class="text-muted-foreground text-sm">{{ t('child.empty') }}</p>

          <template v-for="block in archiveBlocks" :key="block.key">
            <section v-if="block.kind === 'message'" class="text-sm">
              <div class="text-muted-foreground mb-1 text-xs font-medium">{{ t(roleKey(block.role)) }}</div>
              <MarkdownView v-if="block.role !== 'user'" :source="block.text" />
              <p v-else class="whitespace-pre-wrap">{{ block.text }}</p>
            </section>
            <details v-else-if="block.kind === 'reasoning'" class="text-muted-foreground text-sm">
              <summary class="cursor-pointer">{{ t('session.reasoning') }}</summary>
              <MarkdownView :source="block.text" />
            </details>
            <ToolBlock v-else-if="block.kind === 'tool'" :call="block.call" :result="block.result" />
          </template>

          <template v-if="showTrace">
            <p v-if="running" class="text-muted-foreground flex items-center gap-2 border-t pt-3 text-xs font-medium">
              <Spinner class="size-3.5" />
              {{ t('child.live') }}: {{ activityText }}
            </p>
            <p v-if="trace && !trace.complete" class="text-muted-foreground text-xs">{{ t('child.partial') }}</p>

            <template v-for="block in traceBlocks" :key="block.key">
              <section v-if="block.kind === 'message'" class="text-sm">
                <div class="text-muted-foreground mb-1 text-xs font-medium">{{ t(roleKey(block.role)) }}</div>
                <MarkdownView :source="block.text" />
              </section>
              <details v-else-if="block.kind === 'reasoning'" class="text-muted-foreground text-sm">
                <summary class="cursor-pointer">{{ t('session.reasoning') }}</summary>
                <MarkdownView :source="block.text" />
              </details>
              <ToolBlock v-else-if="block.kind === 'tool'" :call="block.call" :result="block.result" :running="block.result === null && running" />
            </template>

            <template v-if="live">
              <details v-if="live.reasoning" class="text-muted-foreground text-sm" open>
                <summary class="cursor-pointer">{{ t('session.reasoning') }}</summary>
                <MarkdownView :source="live.reasoning" streaming />
              </details>
              <section v-if="live.text" class="text-sm">
                <div class="text-muted-foreground mb-1 text-xs font-medium">{{ t('session.role.assistant') }}</div>
                <MarkdownView :source="live.text" streaming />
              </section>
              <ToolBlock v-for="call in live.toolCalls" :key="call.callId" :call="call" :result="null" running />
              <p v-if="live.retries > 0" class="text-muted-foreground text-sm">{{ t('session.retrying', { count: live.retries }) }}</p>
            </template>

            <div v-if="trace?.errors.length" role="alert" class="border-destructive/40 text-destructive space-y-1 rounded-lg border px-3 py-2 text-sm">
              <p v-for="(text, index) in trace.errors" :key="index" class="whitespace-pre-wrap">{{ text }}</p>
            </div>
          </template>

          <section v-if="summary?.todos.length">
            <h3 class="mb-1 text-sm font-medium">{{ t('child.tasks') }}</h3>
            <ul class="space-y-1 text-sm">
              <li v-for="todo in summary.todos" :key="todo.id" class="flex gap-2">
                <span class="text-muted-foreground w-24 shrink-0 text-xs leading-5">{{ displayToken(todo.status) }}</span>
                <span>{{ todo.content }}</span>
              </li>
            </ul>
          </section>
          <section v-if="summary?.notes.length">
            <h3 class="mb-1 text-sm font-medium">{{ t('child.notes') }}</h3>
            <ul class="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
              <li v-for="(note, index) in summary.notes" :key="index">{{ note }}</li>
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
