<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { REQUEST_USAGE_TOKEN_FIELDS, type RequestUsage } from '@/protocol/types'
import ReportRows from './ReportRows.vue'

const props = defineProps<{ groups: RequestUsage[] }>()

const number = new Intl.NumberFormat()
const n = (value: number) => number.format(value)

function scopeLabel(scope: string) {
  switch (scope) {
    case 'Main': return t('report.requestUsage.main')
    case 'Child': return t('report.requestUsage.child')
    case 'Auxiliary': return t('report.requestUsage.auxiliary')
    default: return scope
  }
}

function reportedTokens(value: number | null, reports: number | null, requests: number | null) {
  if (value === null) return t('report.requestUsage.unknown')
  if (reports === null || requests === null || reports >= requests) return n(value)
  return t('report.requestUsage.partial', { tokens: n(value), reports: n(reports), requests: n(requests) })
}

const groups = computed(() => props.groups.map((group) => {
  const requests = group.requestCount
  return {
    key: JSON.stringify([group.scope, group.provider, group.model]),
    heading: [scopeLabel(group.scope), group.provider, group.model].filter(Boolean).join(' · '),
    rows: [
      { label: t('report.field.httpAttempts'), value: n(group.httpAttempts) },
      { label: t('report.field.requestCount'), value: requests === null ? t('report.requestUsage.unknown') : n(requests) },
      { label: t('report.field.usageReports'), value: n(group.usageReports) },
      ...REQUEST_USAGE_TOKEN_FIELDS.map((field) => ({
        label: t(`report.field.${field}`),
        value: reportedTokens(group.tokens[field], group.coverage[field], requests),
      })),
      ...group.cacheWritesByLifetime.map((write) => ({
        label: t('report.requestUsage.lifetime', { seconds: n(write.lifetimeSeconds) }),
        value: reportedTokens(write.tokens, write.reports, requests),
      })),
    ],
  }
}))
</script>

<template>
  <section class="space-y-2">
    <h4 class="text-xs font-medium">{{ t('report.section.requestUsage') }}</h4>
    <section v-for="group in groups" :key="group.key" class="min-w-0 space-y-1.5">
      <h5 class="break-words text-xs text-muted-foreground">{{ group.heading }}</h5>
      <ReportRows :rows="group.rows" />
    </section>
  </section>
</template>
