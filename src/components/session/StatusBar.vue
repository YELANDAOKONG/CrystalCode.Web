<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { t } from '@/i18n'

const model = server.model

const tokens = computed(() => model.usage ?? model.cumulativeUsage)
const contextPercent = computed(() => {
  const window = model.contextWindow
  const used = model.usage?.inputTokens ?? model.estimatedContextTokens
  return window && used ? Math.min(100, Math.round((used / window) * 100)) : null
})
const show = computed(() => model.preferences?.statusLineEnabled ?? true)
</script>

<template>
  <footer v-if="show" class="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-1.5 text-xs">
    <span v-for="field in model.statusFields" :key="field.name">{{ field.text }}</span>
    <span v-if="tokens">{{ t('status.tokens', { input: tokens.inputTokens, output: tokens.outputTokens }) }}</span>
    <span v-if="contextPercent !== null">{{ t('status.context', { percent: contextPercent }) }}</span>
    <span v-if="model.lastTurn">{{ t('status.turn', { reason: model.lastTurn.reason }) }}</span>
  </footer>
</template>
