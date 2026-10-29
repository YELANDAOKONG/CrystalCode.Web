<script setup lang="ts">
import { server } from '@/app/server'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@/composables/query'
import { t } from '@/i18n'
import type { PluginEntry } from '@/protocol/types'
import CatalogNotes from './CatalogNotes.vue'
import CatalogPane from './CatalogPane.vue'

const { data, loading, failed, reload } = useQuery(() => server.loadPlugins())

// `effective` is what the engine decided after the plugin's own switch and the
// global one; `loaded` says it is running now.
function state(plugin: PluginEntry): string {
  if (plugin.error) return t('catalog.plugins.failed')
  if (plugin.loaded) return t('catalog.plugins.loaded')
  return plugin.effective ? t('catalog.plugins.pending') : t('catalog.plugins.off')
}
</script>

<template>
  <CatalogPane :loading="loading" :failed="failed" :empty="!data" :empty-text="t('catalog.plugins.empty')" @refresh="reload">
    <template v-if="data">
      <p v-if="!data.enabled" class="text-muted-foreground text-sm">{{ t('catalog.plugins.disabled') }}</p>
      <p v-else-if="data.plugins.length === 0" class="text-muted-foreground py-4 text-center text-sm">{{ t('catalog.plugins.none') }}</p>
      <ul v-else class="divide-y">
        <li v-for="plugin in data.plugins" :key="plugin.directory" class="space-y-1 py-3">
          <p class="flex items-center gap-2 text-sm font-medium">
            <span class="min-w-0 flex-1 break-all">{{ plugin.name ?? plugin.directory }}</span>
            <Badge :variant="plugin.error ? 'destructive' : plugin.loaded ? 'default' : 'secondary'">{{ state(plugin) }}</Badge>
          </p>
          <p class="text-muted-foreground text-xs">
            {{ plugin.source }} · {{ t('catalog.plugins.counts', { tools: plugin.tools, commands: plugin.commands, hooks: plugin.hooks }) }}
          </p>
          <p v-if="plugin.name" class="text-muted-foreground font-mono text-xs break-all">{{ plugin.directory }}</p>
          <p v-if="plugin.error" role="alert" class="text-destructive text-xs break-words whitespace-pre-wrap">{{ plugin.error }}</p>
        </li>
      </ul>
      <CatalogNotes :notes="data.notes" />
    </template>
  </CatalogPane>
</template>
