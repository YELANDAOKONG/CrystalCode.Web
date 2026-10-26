<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { t } from '@/i18n'

const model = server.model

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
const count = (value: number) => compact.format(value)

// The CLI's custom status line is optional, and the server sends its fields
// only when the user turned it on. The built-in items below always show.
const tokens = computed(() => model.cumulativeUsage ?? model.usage)

// The last call's input size is what the next call starts from, which is the
// context in use. An estimate covers the time before the first call returns.
const contextUsed = computed(() => model.estimatedContextTokens ?? model.usage?.inputTokens ?? null)

const context = computed(() => {
  const window = model.contextWindow
  if (!window) return null
  const used = contextUsed.value
  if (used === null) return t('status.context.window', { window: count(window) })
  const percent = Math.min(100, Math.round((used / window) * 100))
  return t('status.context', { used: count(used), window: count(window), percent })
})
</script>

<template>
  <footer class="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 border-t px-4 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-xs">
    <template v-if="model.statusFields.length">
      <span v-for="field in model.statusFields" :key="field.name">{{ field.text }}</span>
    </template>
    <template v-else>
      <span v-if="model.chrome">{{ t('status.approval', { approval: model.chrome.approval }) }}</span>
      <span v-if="context">{{ context }}</span>
      <span v-if="tokens">{{ t('status.tokens', { input: count(tokens.inputTokens), output: count(tokens.outputTokens) }) }}</span>
    </template>
    <span v-if="model.lastTurn">{{ t('status.turn', { reason: model.lastTurn.reason }) }}</span>
  </footer>
</template>
