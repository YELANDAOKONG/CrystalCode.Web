<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { t } from '@/i18n'
import { displayToken } from '@/session/display-case'
import { contextTenths, formatContextUsed, formatCount, formatWindow } from '@/session/usage-text'

const model = server.model

// The built-in status line of the terminal. The server sends `statusFields`
// only when the operator turned the custom status line on.
const tokens = computed(() => model.cumulativeUsage ?? model.usage)

// CTX is the last call's total over the window, `--` until a call returns.
const contextTokens = computed(() => model.usage?.totalTokens ?? model.estimatedContextTokens ?? null)
const contextLabel = computed(() => formatContextUsed(contextTokens.value, model.contextWindow))

// Colour steps match the terminal: 60% amber, 80% red.
const contextClass = computed(() => {
  const used = contextTokens.value
  if (used === null) return ''
  const percent = contextTenths(used, model.contextWindow) / 10
  if (percent >= 80) return 'text-destructive'
  return percent >= 60 ? 'text-warn' : ''
})

// The terminal capitalises the stop reason like any other token.
const lastTurn = computed(() => (model.lastTurn ? displayToken(model.lastTurn.reason) : ''))
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
      <span v-if="model.contextWindow">{{ t('status.context.window', { window: formatWindow(model.contextWindow) }) }}</span>
      <span :class="contextClass">{{ contextLabel }}</span>
      <span v-if="tokens">{{ formatCount(tokens.inputTokens) }} IN / {{ formatCount(tokens.outputTokens) }} OUT</span>
      <span v-if="model.queue.length">{{ t('status.queued', { count: model.queue.length }) }}</span>
    </template>
    <span v-if="model.lastTurn">{{ t('status.turn', { reason: lastTurn }) }}</span>
  </footer>
</template>
