<script setup lang="ts">
import { RotateCw } from '@lucide/vue'
import { computed } from 'vue'
import { server } from '@/app/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { useBusy } from '@/composables/busy'
import { useQuery } from '@/composables/query'
import { t, type MessageKey } from '@/i18n'
import type { McpServerEntry } from '@/protocol/types'
import { displayToken } from '@/session/display-case'
import CatalogNotes from './CatalogNotes.vue'
import CatalogPane from './CatalogPane.vue'

const { isAdmin } = server
const { data, loading, failed, reload } = useQuery(() => server.loadMcp())

// These write saved configuration and reconnect, so the server asks for admin
// and refuses them while a turn runs.
const { busy, anyBusy, run: track } = useBusy()
const locked = computed(() => !isAdmin.value || server.model.turnActive || anyBusy())
const run = (key: string, command: string) =>
  track(key, async () => {
    await server.send(command)
    await reload()
  })

// The server owns the status words. Only the ones known to mean "up" or
// "broken" get a colour.
const OK = new Set(['connected'])
const BAD = new Set(['failed', 'invalid'])
const variant = (status: string) => (BAD.has(status) ? 'destructive' : OK.has(status) ? 'default' : 'secondary')

// A switch needs a file to rewrite, so a session server (supplied by the front
// end) has none. An invalid definition cannot be switched until its file is
// fixed, and a replaced one is overridden by a later source of the same name.
const switchable = (entry: McpServerEntry) => entry.source !== 'session' && entry.status !== 'invalid' && entry.effective

const key = (entry: McpServerEntry) => `${entry.source}/${entry.name}`
const toggle = (entry: McpServerEntry, on: boolean | 'indeterminate') =>
  run(key(entry), `/mcp ${on === true ? 'enable' : 'disable'} ${entry.name} ${entry.source}`)

const statusText = (entry: McpServerEntry) => {
  const known = ['connected', 'connecting', 'failed', 'disconnected', 'disabled', 'replaced', 'invalid']
  return known.includes(entry.status) ? t(`catalog.mcp.status.${entry.status}` as MessageKey) : displayToken(entry.status)
}
</script>

<template>
  <CatalogPane :loading="loading" :failed="failed" :empty="!data" :empty-text="t('catalog.mcp.empty')" @refresh="reload">
    <template #actions>
      <label v-if="data" class="flex min-h-10 items-center gap-2 text-sm">
        <Spinner v-if="busy('switch')" class="text-muted-foreground size-4 motion-reduce:animate-none" />
        <Switch :model-value="data.enabled" :disabled="locked" :aria-busy="busy('switch') || undefined" @update:model-value="(on) => run('switch', on === true ? '/mcp on' : '/mcp off')" />
        {{ t('catalog.mcp.enabled') }}
      </label>
      <Button v-if="data" variant="outline" size="sm" class="h-10 md:h-8" :disabled="locked || !data.enabled" :aria-busy="busy('reload') || undefined" @click="run('reload', '/mcp reload')">
        <Spinner v-if="busy('reload')" class="size-3.5 motion-reduce:animate-none" />
        <RotateCw v-else class="size-3.5" />
        {{ t('catalog.mcp.reload') }}
      </Button>
    </template>
    <template #summary>
      <p v-if="!isAdmin" class="text-muted-foreground text-xs">{{ t('settings.adminOnly') }}</p>
    </template>
    <template v-if="data">
      <p v-if="!data.enabled" class="text-muted-foreground text-sm">{{ t('catalog.mcp.disabled') }}</p>
      <p v-else-if="data.servers.length === 0" class="text-muted-foreground py-4 text-center text-sm">{{ t('catalog.mcp.none') }}</p>
      <ul v-else class="divide-y">
        <li v-for="entry in data.servers" :key="key(entry)" class="space-y-1 py-3" :class="entry.enabled && entry.effective ? '' : 'opacity-80'">
          <div class="flex items-center gap-2">
            <span class="min-w-0 flex-1 text-sm font-medium break-all">{{ entry.name }}</span>
            <Badge :variant="variant(entry.status)">{{ statusText(entry) }}</Badge>
            <Spinner v-if="busy(key(entry))" class="text-muted-foreground size-4 motion-reduce:animate-none" />
            <Switch
              v-if="switchable(entry)"
              :model-value="entry.enabled"
              :disabled="locked || !data.enabled"
              :aria-busy="busy(key(entry)) || undefined"
              :aria-label="t('catalog.mcp.switch', { name: entry.name })"
              @update:model-value="(on) => toggle(entry, on)"
            />
          </div>
          <p class="text-muted-foreground text-xs">
            <template v-if="entry.transport">{{ entry.transport }} · </template>{{ entry.source }}
          </p>
          <p v-if="entry.status === 'replaced'" class="text-muted-foreground text-xs">{{ t('catalog.mcp.replaced') }}</p>
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
