<script setup lang="ts">
import { server } from '@/app/server'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@/composables/query'
import { t } from '@/i18n'
import type { AgentEntry } from '@/protocol/types'
import { displayToken } from '@/session/display-case'
import CatalogNotes from './CatalogNotes.vue'
import CatalogPane from './CatalogPane.vue'

const { data, loading, failed, reload } = useQuery(() => server.loadAgents())

const limit = (value: number | null) => (value === null ? t('catalog.agents.unlimited') : String(value))

// A null field means the Agent inherits it from the session.
function modelText(agent: AgentEntry): string {
  const m = agent.model
  const name = m.provider && m.model ? `${m.provider} / ${m.model}` : m.model
  const parts = [name, m.thinking ? displayToken(m.thinking) : null, m.tier ? displayToken(m.tier) : null, m.speed ? displayToken(m.speed) : null]
  const text = parts.filter((part): part is string => !!part).join(' · ')
  return text || t('catalog.agents.inherit')
}
</script>

<template>
  <CatalogPane :loading="loading" :failed="failed" :empty="!data" :empty-text="t('catalog.agents.empty')" @refresh="reload">
    <template v-if="data">
      <p v-if="!data.enabled" class="text-muted-foreground text-sm">{{ t('catalog.agents.disabled') }}</p>
      <dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div v-for="[label, value] in [
          [t('catalog.agents.concurrency'), String(data.concurrency)],
          [t('catalog.agents.modelCalls'), limit(data.limits.modelCalls)],
          [t('catalog.agents.toolCalls'), limit(data.limits.toolCalls)],
          [t('catalog.agents.duration'), data.limits.durationSeconds === null ? t('catalog.agents.unlimited') : `${data.limits.durationSeconds} s`],
        ]" :key="label" class="rounded-lg border px-3 py-2">
          <dt class="text-muted-foreground text-xs">{{ label }}</dt>
          <dd class="font-medium tabular-nums">{{ value }}</dd>
        </div>
      </dl>
      <ul class="divide-y">
        <li v-for="agent in data.agents" :key="agent.name" class="space-y-1 py-3">
          <p class="flex items-center gap-2 text-sm font-medium">
            {{ agent.name }}
            <Badge v-if="agent.custom" variant="secondary">{{ t('catalog.agents.custom') }}</Badge>
          </p>
          <p class="text-muted-foreground text-sm break-words">{{ agent.description }}</p>
          <p class="text-muted-foreground text-xs break-words">{{ modelText(agent) }}</p>
          <p class="text-muted-foreground text-xs break-words">
            <template v-if="agent.tools === null">{{ t('catalog.agents.toolsDefault') }}</template>
            <template v-else>{{ agent.tools.join(', ') }}</template>
          </p>
        </li>
      </ul>
      <CatalogNotes :notes="data.notes" />
    </template>
  </CatalogPane>
</template>
