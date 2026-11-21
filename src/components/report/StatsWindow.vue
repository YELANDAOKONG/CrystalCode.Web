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
const unknown = () => t('stats.unknown')
const count = (value: number | null | undefined) => value == null ? unknown() : n(value)
const percent = new Intl.NumberFormat(undefined, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
const sessions = (tracked: number, total: number) => `${n(tracked)} / ${n(total)}`
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
    ...(r.tokenTrackedSessions === null ? [] : [
      { label: t('stats.field.tokenSessions'), value: sessions(r.tokenTrackedSessions, r.sessions) },
    ]),
    ...(r.reasoningTrackedSessions === null ? [] : [
      { label: t('stats.field.reasoningSessions'), value: sessions(r.reasoningTrackedSessions, r.sessions) },
    ]),
    { label: t('report.field.inputTokens'), value: count(r.inputTokens) },
    { label: t('report.field.outputTokens'), value: count(r.outputTokens) },
    { label: t('report.field.reasoningTokens'), value: count(r.reasoningTokens) },
    { label: t('report.field.totalTokens'), value: count(r.totalTokens) },
    { label: t('stats.field.average'), value: count(r.averageTokensPerSession) },
    { label: t('stats.field.median'), value: count(r.medianTokensPerSession) },
  ]
})

const cache = computed(() => {
  const r = report.value
  if (!r || r.cacheTrackedSessions === null) return []
  const usage = r.cacheUsage
  const requests = usage?.requestCount ?? 0
  const covered = (value: string, reports: number) => reports > 0 && reports < requests
    ? t('stats.cache.coverage', { value, reports: n(reports), requests: n(requests) })
    : value
  const rate = usage?.readRatePercent
  return [
    ...(r.cacheWindowDays === null ? [] : [
      { label: t('stats.cache.window'), value: n(r.cacheWindowDays) },
    ]),
    { label: t('stats.field.cacheSessions'), value: r.cacheWindowDays === null
      ? sessions(r.cacheTrackedSessions, r.sessions) : n(r.cacheTrackedSessions) },
    { label: t('stats.cache.reads'), value: covered(count(usage?.readTokens), usage?.readReports ?? 0) },
    { label: t('stats.cache.writes'), value: covered(count(usage?.writeTokens), usage?.writeReports ?? 0) },
    { label: t('stats.cache.rate'), value: covered(rate == null ? unknown() : percent.format(rate / 100),
      usage?.comparableRequests ?? 0) },
    ...(usage?.writesByLifetime ?? []).map((write) => ({
      label: t('stats.cache.lifetime', { seconds: n(write.lifetimeSeconds) }),
      value: covered(n(write.tokens), write.reports),
    })),
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

        <section v-if="cache.length" class="space-y-2">
          <h3 class="text-sm font-medium">{{ t('stats.cache') }}</h3>
          <ReportRows :rows="cache" />
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
