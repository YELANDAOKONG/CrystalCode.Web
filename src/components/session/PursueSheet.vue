<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ChevronRight } from '@lucide/vue'
import { server } from '@/app/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { t } from '@/i18n'
import type { PursueCheck } from '@/protocol/types'
import PursueCheckView from './PursueCheckView.vue'
import { pursueLabel } from './pursue-label'

const open = defineModel<boolean>('open', { required: true })
const model = server.model
const pursue = computed(() => model.pursue)
const checks = ref<PursueCheck[]>([])
const offset = ref(0)
const hasMore = ref(false)
const loading = ref(false)
const failed = ref(false)
const changed = ref(false)
const initialized = ref(false)
const latest = computed(() => {
  const check = pursue.value?.latestCheck
  return check && !checks.value.some((item) => item.id === check.id) ? check : null
})
const stats = computed(() => {
  const current = pursue.value
  if (!current) return []
  return [
    { label: t('pursue.stat.total'), value: current.checkCount },
    { label: t('pursue.stat.run'), value: current.checks },
    { label: t('pursue.stat.continuations'), value: current.continuations },
    { label: t('pursue.stat.stalls'), value: current.stalls },
  ]
})
let request: AbortController | undefined

function reset(): void {
  request?.abort()
  request = undefined
  checks.value = []
  offset.value = 0
  hasMore.value = false
  loading.value = false
  failed.value = false
  changed.value = false
  initialized.value = false
}

async function load(refresh = false): Promise<void> {
  if (loading.value || !open.value || server.phase.value !== 'live') return
  const id = pursue.value?.id
  if (!id) return
  const controller = new AbortController()
  request = controller
  loading.value = true
  failed.value = false
  changed.value = false
  const seq = model.lastSeq
  if (refresh) {
    const current = await server.loadPursue(controller.signal)
    if (controller.signal.aborted) return
    if (current === undefined) {
      failed.value = true
      loading.value = false
      return
    }
    if (current?.id !== id) {
      checks.value = []
      changed.value = true
      loading.value = false
      return
    }
    // Never overwrite a newer event with a query that started before it.
    if (seq === model.lastSeq) model.pursue = current
  }
  const page = await server.loadPursueChecks(refresh ? 0 : offset.value, controller.signal)
  if (controller.signal.aborted) return
  if (!page) failed.value = true
  else if (page.objectiveId !== id || pursue.value?.id !== id) {
    checks.value = []
    changed.value = true
  } else {
    const merged = new Map((refresh ? [] : checks.value).map((check) => [check.id, check]))
    for (const check of page.checks) {
      if (check.objectiveId === id) merged.set(check.id, check)
    }
    checks.value = [...merged.values()]
    offset.value = page.nextOffset
    hasMore.value = page.hasMore
    initialized.value = true
  }
  loading.value = false
}

watch(
  [() => open.value, () => model.sessionId, () => pursue.value?.id, () => model.snapshotRevision, () => server.phase.value],
  () => {
    reset()
    if (open.value) void load(true)
  },
  { immediate: true },
)
// Fetch from the contiguous page offset, not from the newest live check: events
// may arrive while older pages are still unread. This also catches missed checks.
watch(
  [() => pursue.value?.checkCount, () => pursue.value?.latestCheck?.id, () => loading.value],
  () => {
    if (initialized.value && !hasMore.value && !failed.value && !changed.value && (pursue.value?.checkCount ?? 0) > offset.value) void load()
  },
)
onBeforeUnmount(() => request?.abort())
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="w-full gap-0 sm:max-w-xl">
      <SheetHeader class="border-b pb-3">
        <SheetTitle>{{ t('pursue.title') }}</SheetTitle>
        <SheetDescription>{{ t('pursue.description') }}</SheetDescription>
      </SheetHeader>
      <div class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4" tabindex="0" :aria-busy="loading">
        <template v-if="pursue">
          <section class="flex flex-col gap-3 text-sm">
            <div class="flex flex-wrap items-center gap-2">
              <Badge :variant="pursue.status === 'blocked' ? 'destructive' : 'secondary'">{{ pursueLabel('status', pursue.status) }}</Badge>
              <Badge variant="outline">{{ pursueLabel('phase', pursue.phase) }}</Badge>
            </div>
            <p class="text-base leading-snug font-medium whitespace-pre-wrap break-words">{{ pursue.objective }}</p>
            <dl class="grid grid-cols-4 gap-2">
              <div v-for="stat in stats" :key="stat.label" class="bg-card rounded-lg border px-3 py-2">
                <dd class="text-lg leading-tight font-semibold tabular-nums">{{ stat.value }}</dd>
                <dt class="text-muted-foreground truncate text-xs" :title="stat.label">{{ stat.label }}</dt>
              </div>
            </dl>
            <p v-if="pursue.reason" class="whitespace-pre-wrap break-words">{{ pursue.reason }}</p>
            <p v-if="pursue.nextStep" class="bg-muted rounded-lg px-3 py-2 whitespace-pre-wrap break-words">
              <span class="text-muted-foreground block text-xs">{{ t('pursue.nextStep') }}</span>
              {{ pursue.nextStep }}
            </p>
            <details class="text-muted-foreground group text-xs">
              <summary class="hover:text-foreground flex cursor-pointer list-none items-center gap-1">
                <ChevronRight class="size-3.5 transition-transform group-open:rotate-90" />
                {{ t('pursue.identifiers') }}
              </summary>
              <dl class="mt-2 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1">
                <dt>{{ t('pursue.objectiveId') }}</dt>
                <dd class="font-mono break-all select-text">{{ pursue.id }}</dd>
                <dt>{{ t('pursue.runId') }}</dt>
                <dd class="font-mono break-all select-text">{{ pursue.runId }}</dd>
                <template v-if="pursue.reasonCode">
                  <dt>{{ t('pursue.reasonCode') }}</dt>
                  <dd class="font-mono break-all select-text">{{ pursue.reasonCode }}</dd>
                </template>
              </dl>
            </details>
          </section>
          <section v-if="latest" class="min-w-0">
            <h2 class="mb-1 text-sm font-semibold">{{ t('pursue.latest') }}</h2>
            <PursueCheckView :key="latest.id" :check="latest" />
          </section>
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold">{{ t('pursue.history') }}</h2>
            <Button variant="outline" size="sm" :disabled="loading || server.phase.value !== 'live'" @click="load(true)">{{ t('catalog.refresh') }}</Button>
          </div>
          <p v-if="server.phase.value !== 'live'" role="status" class="text-muted-foreground text-sm">{{ t('pursue.offline') }}</p>
          <p v-if="loading" role="status" class="text-muted-foreground flex items-center gap-2 text-sm"><Spinner class="motion-reduce:animate-none" />{{ t('catalog.loading') }}</p>
          <p v-if="failed" role="alert" class="text-destructive text-sm">{{ t('pursue.failed') }}</p>
          <p v-if="changed" role="status" class="text-muted-foreground text-sm">{{ t('pursue.changed') }}</p>
          <p v-if="initialized && !loading && !failed && !changed && !checks.length" class="text-muted-foreground text-sm">{{ t('pursue.empty') }}</p>
          <ol class="flex min-w-0 flex-col">
            <li v-for="check in checks" :key="check.id" class="min-w-0"><PursueCheckView :check="check" /></li>
          </ol>
          <Button v-if="hasMore || (failed && initialized)" variant="outline" :disabled="loading || server.phase.value !== 'live'" @click="load()">{{ failed ? t('pursue.retry') : t('pursue.more') }}</Button>
        </template>
        <p v-else class="text-muted-foreground text-sm">{{ t('pursue.none') }}</p>
      </div>
    </SheetContent>
  </Sheet>
</template>
