<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useBusy } from '@/composables/busy'
import { useQuery } from '@/composables/query'
import { t } from '@/i18n'
import type { ModelEntry } from '@/protocol/types'
import { displayToken } from '@/session/display-case'
import { pendingText } from '@/session/pending-text'
import { formatCount, formatWindow } from '@/session/usage-text'
import CatalogPane from './CatalogPane.vue'

const { isAdmin } = server
const { data, loading, failed, reload } = useQuery(() => server.loadModels())

const groups = computed(() => {
  const byProvider = new Map<string, ModelEntry[]>()
  for (const entry of data.value?.models ?? []) {
    byProvider.set(entry.provider, [...(byProvider.get(entry.provider) ?? []), entry])
  }

  return [...byProvider]
})

const waiting = computed(() => pendingText(data.value?.pending ?? {}))

// What the model offers, as a short line. The labels are the server's tokens.
function traits(entry: ModelEntry): string {
  const parts: string[] = []
  if (entry.contextWindows.length) parts.push(entry.contextWindows.map(formatWindow).join(' / '))
  if (entry.thinking) parts.push(t('catalog.models.thinking'))
  if (entry.imageInput) parts.push(t('catalog.models.image'))
  if (entry.serviceTiers.length) parts.push(entry.serviceTiers.map(displayToken).join(' / '))
  if (entry.maxTokens !== null) parts.push(t('catalog.models.output', { count: formatCount(entry.maxTokens) }))
  return parts.join(' · ')
}

const { busy, anyBusy, run } = useBusy()
const keyOf = (entry: ModelEntry) => `${entry.provider} ${entry.model}`
async function use(entry: ModelEntry): Promise<void> {
  await run(keyOf(entry), async () => {
    await server.send(`/model ${keyOf(entry)}`)
    await reload()
  })
}
</script>

<template>
  <CatalogPane :loading="loading" :failed="failed" :empty="groups.length === 0" :empty-text="t('catalog.models.empty')" @refresh="reload">
    <template #summary>
      <p v-if="waiting" class="text-muted-foreground text-xs">{{ t('settings.pending', { value: waiting }) }}</p>
      <p v-if="!isAdmin" class="text-muted-foreground text-xs">{{ t('settings.adminOnly') }}</p>
    </template>
    <section v-for="[provider, entries] in groups" :key="provider" class="space-y-1">
      <h3 class="text-muted-foreground text-xs font-medium">{{ provider }}</h3>
      <ul class="divide-y rounded-lg border">
        <li v-for="entry in entries" :key="entry.model" class="flex items-center gap-3 px-3 py-2.5">
          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
              <span class="break-all">{{ entry.model }}</span>
              <Badge v-if="entry.current">{{ t('catalog.models.current') }}</Badge>
              <Badge v-if="!entry.credentialReady" variant="outline" class="text-warn border-warn-line">{{ t('catalog.models.noCredential') }}</Badge>
            </p>
            <p class="text-muted-foreground mt-0.5 text-xs">{{ entry.protocol }}<template v-if="traits(entry)"> · {{ traits(entry) }}</template></p>
          </div>
          <Button v-if="!entry.current" variant="outline" size="sm" class="h-10 md:h-8" :disabled="!isAdmin || anyBusy()" :aria-busy="busy(keyOf(entry)) || undefined" @click="use(entry)">
            <Spinner v-if="busy(keyOf(entry))" class="size-3.5 motion-reduce:animate-none" />
            {{ t('catalog.models.use') }}
          </Button>
        </li>
      </ul>
    </section>
  </CatalogPane>
</template>
