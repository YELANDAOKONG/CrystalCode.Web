<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from '@lucide/vue'
import MarkdownView from '@/components/render/MarkdownView.vue'
import { t } from '@/i18n'
import type { Notice } from '@/session/state'
import { parseTodos } from '@/protocol/parse'
import HelpReportView from './HelpReportView.vue'
import StatsReportView from './StatsReportView.vue'
import StatusReportView from './StatusReportView.vue'
import ToolsReportView from './ToolsReportView.vue'

const props = defineProps<{ notice: Notice }>()

const title = computed(() => {
  const data = props.notice.data
  switch (props.notice.type) {
    case 'report.help':
      return t('report.help')
    case 'report.status':
      return data.full === true ? t('report.status.full') : t('report.status')
    case 'report.stats':
      return data.allWorkspaces === true ? t('report.stats.all') : t('report.stats')
    case 'report.tools':
      return t('report.tools')
    case 'report.todos':
      return t('report.todos')
    default:
      return props.notice.type.replace('report.', '')
  }
})

const known = computed(() => ['report.help', 'report.status', 'report.stats', 'report.tools', 'report.todos'].includes(props.notice.type))
const todos = computed(() => parseTodos(props.notice.data.items))
</script>

<template>
  <details class="group bg-card rounded-lg border text-sm" open>
    <summary class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium">
      <ChevronRight class="text-muted-foreground size-4 transition-transform group-open:rotate-90" />
      {{ title }}
    </summary>
    <div class="max-h-[28rem] overflow-y-auto border-t px-3 py-3">
      <HelpReportView v-if="notice.type === 'report.help'" :data="notice.data" />
      <StatusReportView v-else-if="notice.type === 'report.status'" :data="notice.data" />
      <StatsReportView v-else-if="notice.type === 'report.stats'" :data="notice.data" />
      <ToolsReportView v-else-if="notice.type === 'report.tools'" :data="notice.data" />
      <ul v-else-if="notice.type === 'report.todos'" class="space-y-1">
        <li v-if="todos.length === 0" class="text-muted-foreground">{{ t('report.none') }}</li>
        <li v-for="todo in todos" :key="todo.id" class="flex gap-2">
          <span class="text-muted-foreground w-24 shrink-0 text-xs leading-5">{{ todo.status }}</span>
          <span>{{ todo.content }}</span>
        </li>
      </ul>
      <MarkdownView v-else-if="!known" :source="notice.text" />
    </div>
  </details>
</template>
