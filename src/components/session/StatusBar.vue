<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { t } from '@/i18n'
import { displayToken } from '@/session/display-case'

const model = server.model

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
const count = (value: number) => compact.format(value)

// The CLI's custom status line is optional, and the server sends its fields
// only when the user turned it on. The built-in items below always show.
const tokens = computed(() => model.cumulativeUsage ?? model.usage)

// Mirrors the CLI's built-in status line: CTX is the last call's total over
// the window, shown as "--" until the first call returns.
const contextTokens = computed(() => model.usage?.totalTokens ?? model.estimatedContextTokens ?? null)

const contextPercent = computed(() => {
  const window = model.contextWindow
  const used = contextTokens.value
  if (!window || used === null) return null
  return Math.min(100, Math.round((used / window) * 100))
})

const contextClass = computed(() => {
  const percent = contextPercent.value ?? 0
  if (percent >= 80) return 'text-destructive'
  return percent >= 60 ? 'text-amber-600 dark:text-amber-400' : ''
})

const contextLabel = computed(() => (contextPercent.value === null ? 'CTX --' : `CTX ${contextPercent.value}%`))
</script>

<template>
  <footer class="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 border-t px-4 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-xs">
    <template v-if="model.statusFields.length">
      <span v-for="field in model.statusFields" :key="field.name">{{ field.text }}</span>
    </template>
    <template v-else>
      <template v-if="model.chrome">
        <span v-if="model.chrome.approval">{{ displayToken(model.chrome.approval) }}</span>
        <span v-if="model.chrome.serviceTier">{{ model.chrome.serviceTier }}</span>
        <span v-if="model.chrome.speed">{{ model.chrome.speed }}</span>
      </template>
      <span v-if="model.contextWindow">{{ t('status.context.window', { window: count(model.contextWindow) }) }}</span>
      <span :class="contextClass">{{ contextLabel }}</span>
      <span v-if="tokens">{{ count(tokens.inputTokens) }} IN / {{ count(tokens.outputTokens) }} OUT</span>
      <span v-if="model.queue.length">{{ t('status.queued', { count: model.queue.length }) }}</span>
    </template>
    <span v-if="model.lastTurn">{{ t('status.turn', { reason: model.lastTurn.reason }) }}</span>
  </footer>
</template>
