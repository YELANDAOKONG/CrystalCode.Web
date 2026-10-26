<script setup lang="ts">
import { computed } from 'vue'
import { t, type MessageKey } from '@/i18n'
import { parseStatsReport } from '@/protocol/parse'
import ReportRows from './ReportRows.vue'

const props = defineProps<{ data: Record<string, unknown> }>()

const report = computed(() => parseStatsReport(props.data))

const number = new Intl.NumberFormat()
const n = (value: number) => number.format(value)
const label = (key: string) => t(`report.field.${key}` as MessageKey)
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '')

const rows = computed(() => {
  const r = report.value
  return [
    { label: t('report.stats.sessions'), value: n(r.sessions) },
    { label: label('userTurns'), value: n(r.userTurns) },
    { label: label('modelCalls'), value: n(r.modelCalls) },
    { label: label('toolCalls'), value: n(r.toolCalls) },
  ]
})

const tokens = computed(() => {
  const r = report.value
  return [
    { label: label('inputTokens'), value: n(r.inputTokens) },
    { label: label('outputTokens'), value: n(r.outputTokens) },
    { label: label('reasoningTokens'), value: n(r.reasoningTokens) },
    { label: label('totalTokens'), value: n(r.totalTokens) },
    { label: t('report.stats.average'), value: n(r.averageTokensPerSession) },
    { label: t('report.stats.median'), value: n(r.medianTokensPerSession) },
  ]
})

const range = computed(() => {
  const r = report.value
  if (!r.earliest || !r.latest) return ''
  return `${t('report.stats.window', { days: r.windowDays })} · ${t('report.stats.range', { from: day(r.earliest), to: day(r.latest) })}`
})

// Bars scale to the busiest tool so the list reads as a ranking.
const peak = computed(() => Math.max(1, ...report.value.topTools.map((tool) => tool.count)))
</script>

<template>
  <div class="space-y-4">
    <p v-if="range" class="text-muted-foreground text-xs">{{ range }}</p>
    <ReportRows :rows="rows" />
    <section>
      <h4 class="mb-1.5 text-xs font-medium">{{ t('report.section.tokens') }}</h4>
      <ReportRows :rows="tokens" />
    </section>
    <section v-if="report.topTools.length">
      <h4 class="mb-1.5 text-xs font-medium">{{ t('report.stats.topTools') }}</h4>
      <ul class="space-y-1.5 text-sm">
        <li v-for="tool in report.topTools" :key="tool.name" class="grid grid-cols-[minmax(6rem,12rem)_1fr_auto] items-center gap-3">
          <span class="truncate font-mono text-xs">{{ tool.name }}</span>
          <span class="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden="true">
            <span class="bg-ring block h-full rounded-full" :style="{ width: `${(tool.count / peak) * 100}%` }" />
          </span>
          <span class="text-muted-foreground tabular-nums">{{ n(tool.count) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
