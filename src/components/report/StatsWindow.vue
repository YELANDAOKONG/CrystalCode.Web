<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { t } from '@/i18n'
import { parseStatsReport } from '@/protocol/parse'
import ReportRows from './ReportRows.vue'

// /stats opens a page of its own, as it does in the terminal. It is not part
// of the conversation and closing it leaves the conversation as it was.
const page = computed(() => server.model.statsPage)
const report = computed(() => (page.value ? parseStatsReport(page.value.data) : null))

const number = new Intl.NumberFormat()
const n = (value: number) => number.format(value)
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : t('stats.none'))

const overview = computed(() => {
  const r = report.value
  if (!r) return []
  return [
    { label: t('report.stats.sessions'), value: n(r.sessions) },
    { label: t('report.field.userTurns'), value: n(r.userTurns) },
    { label: t('report.field.modelCalls'), value: n(r.modelCalls) },
    { label: t('report.field.toolCalls'), value: n(r.toolCalls) },
    { label: t('stats.field.days'), value: n(r.windowDays) },
    { label: t('stats.field.earliest'), value: when(r.earliest) },
    { label: t('stats.field.latest'), value: when(r.latest) },
  ]
})

const tokens = computed(() => {
  const r = report.value
  if (!r) return []
  return [
    { label: t('report.field.inputTokens'), value: n(r.inputTokens) },
    { label: t('report.field.outputTokens'), value: n(r.outputTokens) },
    { label: t('report.field.reasoningTokens'), value: n(r.reasoningTokens) },
    { label: t('report.field.totalTokens'), value: n(r.totalTokens) },
    { label: t('stats.field.average'), value: n(r.averageTokensPerSession) },
    { label: t('stats.field.median'), value: n(r.medianTokensPerSession) },
  ]
})

// Bars scale to the busiest tool so the list reads as a ranking.
const peak = computed(() => Math.max(1, ...(report.value?.topTools.map((tool) => tool.count) ?? [1])))
const share = (count: number) => {
  const total = report.value?.toolCalls ?? 0
  return total > 0 ? `${Math.round((count / total) * 100)}%` : ''
}

function close(): void {
  server.model.dismissStats()
}
</script>

<template>
  <Dialog :open="page !== null" @update:open="(open) => !open && close()">
    <DialogContent class="max-h-[min(92dvh,46rem)] gap-5 overflow-y-auto sm:max-w-lg" :show-close-button="true">
      <template v-if="report">
        <DialogHeader class="text-left">
          <DialogTitle>{{ t('stats.title') }}</DialogTitle>
          <DialogDescription>
            {{ report.allWorkspaces ? t('stats.scope.all') : t('stats.scope.workspace') }}
          </DialogDescription>
        </DialogHeader>

        <section class="space-y-2">
          <h3 class="text-sm font-medium">{{ t('stats.overview') }}</h3>
          <ReportRows :rows="overview" />
        </section>

        <section class="space-y-2">
          <h3 class="text-sm font-medium">{{ t('stats.tokens') }}</h3>
          <ReportRows :rows="tokens" />
        </section>

        <section class="space-y-2">
          <h3 class="text-sm font-medium">{{ t('stats.tools') }}</h3>
          <p v-if="report.topTools.length === 0" class="text-muted-foreground text-sm">{{ t('stats.none') }}</p>
          <ul v-else class="space-y-2 text-sm">
            <li
              v-for="tool in report.topTools"
              :key="tool.name"
              class="grid grid-cols-[minmax(5rem,9rem)_1fr_auto] items-center gap-3"
            >
              <span class="truncate font-mono text-xs">{{ tool.name }}</span>
              <span class="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden="true">
                <span class="bg-ring block h-full rounded-full" :style="{ width: `${(tool.count / peak) * 100}%` }" />
              </span>
              <span class="tabular-nums">
                {{ n(tool.count) }}
                <span class="text-muted-foreground ml-1 text-xs">{{ share(tool.count) }}</span>
              </span>
            </li>
          </ul>
        </section>
      </template>
    </DialogContent>
  </Dialog>
</template>
