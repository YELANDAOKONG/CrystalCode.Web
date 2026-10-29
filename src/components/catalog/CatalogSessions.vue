<script setup lang="ts">
import { ref, watch } from 'vue'
import { server } from '@/app/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useQuery } from '@/composables/query'
import { t } from '@/i18n'
import { modeLabel } from '@/session/mode'
import CatalogPane from './CatalogPane.vue'

const emit = defineEmits<{ leave: [] }>()
const { isAdmin } = server

const all = ref(false)
const { data, loading, failed, reload } = useQuery(() => server.loadSessions(all.value))
watch(all, () => void reload())

const when = (iso: string | null) => {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

// /resume replaces the session in this process. The transcript redraws from
// the conversation.replayed event, so the dialog only has to get out of the way.
async function resume(id: string): Promise<void> {
  const result = await server.send(`/resume ${id}`)
  if (result?.accepted) emit('leave')
}
</script>

<template>
  <CatalogPane :loading="loading" :failed="failed" :empty="!data || data.length === 0" :empty-text="t('catalog.sessions.empty')" @refresh="reload">
    <template #actions>
      <label class="flex min-h-10 items-center gap-2 text-sm">
        <Switch v-model="all" />
        {{ t('catalog.sessions.all') }}
      </label>
    </template>
    <ul class="divide-y">
      <li v-for="session in data" :key="session.id" class="flex items-start gap-3 py-3">
        <div class="min-w-0 flex-1 space-y-1">
          <p class="line-clamp-2 text-sm font-medium break-words">{{ session.preview || t('catalog.sessions.untitled') }}</p>
          <p class="text-muted-foreground text-xs">
            {{ t('catalog.sessions.turns', { count: session.userTurns }) }} · {{ modeLabel(session.mode) }} · {{ when(session.updatedUtc) }}
          </p>
          <p v-if="all" class="text-muted-foreground font-mono text-xs break-all">{{ session.workspace }}</p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1.5">
          <Badge v-if="session.current">{{ t('catalog.sessions.current') }}</Badge>
          <Badge v-else-if="session.open" variant="outline">{{ t('catalog.sessions.open') }}</Badge>
          <Button v-else variant="outline" size="sm" class="h-10 md:h-8" :disabled="!isAdmin" :title="isAdmin ? undefined : t('settings.adminOnly')" @click="resume(session.id)">
            {{ t('catalog.sessions.resume') }}
          </Button>
        </div>
      </li>
    </ul>
  </CatalogPane>
</template>
