<script setup lang="ts">
import { computed } from 'vue'
import { t, type MessageKey } from '@/i18n'
import { parseStatusReport } from '@/protocol/parse'
import { displayToken } from '@/session/display-case'
import { modeLabel } from '@/session/mode'
import ReportRows from './ReportRows.vue'

const props = defineProps<{ data: Record<string, unknown> }>()

const report = computed(() => parseStatusReport(props.data))

const number = new Intl.NumberFormat()
const n = (value: number) => number.format(value)
const label = (key: string) => t(`report.field.${key}` as MessageKey)
const onOff = (value: boolean) => (value ? t('report.on') : t('report.off'))

const when = (iso: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

const context = computed(() => {
  const r = report.value
  const rows = [{ label: label('contextWindow'), value: n(r.contextWindow) }]
  if (r.usage && r.contextWindow > 0) {
    const percent = Math.min(100, Math.round((r.usage.totalTokens / r.contextWindow) * 100))
    rows.push({ label: label('contextUsed'), value: `${n(r.usage.totalTokens)} (${percent}%)` })
  }

  return rows
})

const workspace = computed(() => {
  const r = report.value
  return [
    { label: label('workspace'), value: r.workspace, mono: true },
    { label: label('mode'), value: modeLabel(r.mode) },
    { label: label('approval'), value: displayToken(r.approval) },
    ...(r.promptSet ? [{ label: label('promptSet'), value: r.promptSet }] : []),
  ]
})

const model = computed(() => {
  const r = report.value
  const rows = [
    { label: label('provider'), value: r.provider },
    { label: label('model'), value: r.model },
    { label: label('thinking'), value: r.thinking },
  ]
  if (r.serviceTier) rows.push({ label: label('serviceTier'), value: r.serviceTier })
  if (r.speed) rows.push({ label: label('speed'), value: r.speed })
  for (const [key, value] of Object.entries(r.slots)) rows.push({ label: label(key), value })
  return rows
})

const usageRows = (usage: { inputTokens: number; outputTokens: number; reasoningTokens: number | null; totalTokens: number } | null) =>
  usage
    ? [
        { label: label('inputTokens'), value: n(usage.inputTokens) },
        { label: label('outputTokens'), value: n(usage.outputTokens) },
        ...(usage.reasoningTokens !== null ? [{ label: label('reasoningTokens'), value: n(usage.reasoningTokens) }] : []),
        { label: label('totalTokens'), value: n(usage.totalTokens) },
      ]
    : []

const options = computed(() =>
  Object.entries(report.value.flags).map(([key, value]) => ({ label: label(key), value: onOff(value) })),
)

const activity = computed(() => {
  const r = report.value
  return [
    { label: label('sessionId'), value: r.sessionId, mono: true },
    { label: label('started'), value: when(r.startedUtc) },
    ...['userTurns', 'modelCalls', 'toolCalls', 'queuedMessages', 'todos'].map((key) => ({
      label: label(key),
      value: n(r.counts[key] ?? 0),
    })),
  ]
})

const tools = computed(() =>
  ['planTools', 'workTools', 'externalTools', 'plugins', 'mcpServers', 'mcpTools'].map((key) => ({
    label: label(key),
    value: n(report.value.counts[key] ?? 0),
  })),
)
</script>

<template>
  <div class="space-y-4">
    <section>
      <h4 class="mb-1.5 text-xs font-medium">{{ t('report.section.workspace') }}</h4>
      <ReportRows :rows="workspace" />
    </section>
    <section>
      <h4 class="mb-1.5 text-xs font-medium">{{ t('report.section.model') }}</h4>
      <ReportRows :rows="model" />
    </section>
    <section>
      <h4 class="mb-1.5 text-xs font-medium">{{ t('report.section.context') }}</h4>
      <ReportRows :rows="context" />
    </section>
    <section v-if="report.cumulativeUsage">
      <h4 class="mb-1.5 text-xs font-medium">{{ t('report.field.session') }}</h4>
      <ReportRows :rows="usageRows(report.cumulativeUsage)" />
    </section>
    <section v-if="report.full && report.usage">
      <h4 class="mb-1.5 text-xs font-medium">{{ t('report.field.lastRequest') }}</h4>
      <ReportRows :rows="usageRows(report.usage)" />
    </section>
    <section>
      <h4 class="mb-1.5 text-xs font-medium">{{ t('report.section.options') }}</h4>
      <ReportRows :rows="options" />
    </section>
    <template v-if="report.full">
      <section>
        <h4 class="mb-1.5 text-xs font-medium">{{ t('report.section.activity') }}</h4>
        <ReportRows :rows="activity" />
      </section>
      <section>
        <h4 class="mb-1.5 text-xs font-medium">{{ t('report.section.tools') }}</h4>
        <ReportRows :rows="tools" />
      </section>
    </template>
  </div>
</template>
