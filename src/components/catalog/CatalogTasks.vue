<script setup lang="ts">
import { ref } from 'vue'
import { ChevronRight } from '@lucide/vue'
import { server } from '@/app/server'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@/composables/query'
import { t } from '@/i18n'
import { displayToken } from '@/session/display-case'
import CatalogPane from './CatalogPane.vue'
import TaskLog from './TaskLog.vue'

const { data, loading, failed, reload } = useQuery(() => server.loadTasks())
const open = ref<string | null>(null)

const RUNNING = new Set(['starting', 'running'])
const variant = (status: string) => (RUNNING.has(status) ? 'default' : status === 'exited' || status === 'stopped' ? 'secondary' : 'destructive')

const when = (iso: string | null) => {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

function toggle(id: string): void {
  open.value = open.value === id ? null : id
}
</script>

<template>
  <CatalogPane :loading="loading" :failed="failed" :empty="!data || data.length === 0" :empty-text="t('catalog.tasks.empty')" @refresh="reload">
    <ul class="divide-y">
      <li v-for="task in data" :key="task.id" class="py-2">
        <button
          type="button"
          class="hover:bg-accent focus-visible:ring-ring flex min-h-11 w-full items-start gap-2 rounded-md px-1 py-1.5 text-left outline-none focus-visible:ring-2"
          :aria-expanded="open === task.id"
          @click="toggle(task.id)"
        >
          <ChevronRight class="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform motion-reduce:transition-none" :class="open === task.id ? 'rotate-90' : ''" />
          <span class="min-w-0 flex-1 space-y-1">
            <span class="block font-mono text-xs leading-5 break-all">{{ task.command }}</span>
            <span class="text-muted-foreground block text-xs">
              {{ when(task.startedUtc) }}<template v-if="task.exitCode !== null"> · {{ t('catalog.tasks.exit', { code: task.exitCode }) }}</template>
            </span>
          </span>
          <Badge :variant="variant(task.status)">{{ displayToken(task.status) }}</Badge>
        </button>
        <div v-if="open === task.id" class="space-y-2 pt-2 pl-7">
          <p class="text-muted-foreground font-mono text-xs break-all">{{ task.workingDirectory }}</p>
          <TaskLog :task="task" />
        </div>
      </li>
    </ul>
  </CatalogPane>
</template>
