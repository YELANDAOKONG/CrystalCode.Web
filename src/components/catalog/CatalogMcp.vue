<script setup lang="ts">
import { server } from '@/app/server'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@/composables/query'
import { t } from '@/i18n'
import { displayToken } from '@/session/display-case'
import CatalogNotes from './CatalogNotes.vue'
import CatalogPane from './CatalogPane.vue'

const { data, loading, failed, reload } = useQuery(() => server.loadMcp())

// The server owns the status words. Only the ones known to mean "up" or
// "broken" get a colour.
const OK = new Set(['connected', 'ready', 'running'])
const BAD = new Set(['failed', 'error'])
const variant = (status: string) => (BAD.has(status.toLowerCase()) ? 'destructive' : OK.has(status.toLowerCase()) ? 'default' : 'secondary')
</script>

<template>
  <CatalogPane :loading="loading" :failed="failed" :empty="!data" :empty-text="t('catalog.mcp.empty')" @refresh="reload">
    <template v-if="data">
      <p v-if="!data.enabled" class="text-muted-foreground text-sm">{{ t('catalog.mcp.disabled') }}</p>
      <p v-else-if="data.servers.length === 0" class="text-muted-foreground py-4 text-center text-sm">{{ t('catalog.mcp.none') }}</p>
      <ul v-else class="divide-y">
        <li v-for="entry in data.servers" :key="entry.name" class="space-y-1 py-3">
          <p class="flex items-center gap-2 text-sm font-medium">
            <span class="min-w-0 flex-1 break-all">{{ entry.name }}</span>
            <Badge :variant="variant(entry.status)">{{ displayToken(entry.status) }}</Badge>
          </p>
          <p class="text-muted-foreground text-xs">{{ entry.transport }} · {{ entry.source }}</p>
          <p v-if="entry.error" role="alert" class="text-destructive text-xs break-words whitespace-pre-wrap">{{ entry.error }}</p>
          <details v-if="entry.tools.length" class="text-xs">
            <summary class="text-muted-foreground cursor-pointer">{{ t('catalog.mcp.tools', { count: entry.tools.length }) }}</summary>
            <p class="mt-1 font-mono leading-5 break-words">{{ entry.tools.join(', ') }}</p>
          </details>
        </li>
      </ul>
      <CatalogNotes :notes="data.notes" />
    </template>
  </CatalogPane>
</template>
