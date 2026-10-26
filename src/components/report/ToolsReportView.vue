<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n'
import { parseToolsReport } from '@/protocol/parse'

const props = defineProps<{ data: Record<string, unknown> }>()

const report = computed(() => parseToolsReport(props.data))

const catalogs = (tool: { plan: boolean; work: boolean }) =>
  [tool.plan ? 'Plan' : '', tool.work ? 'Work' : ''].filter(Boolean).join(' · ')
</script>

<template>
  <div class="space-y-4">
    <section v-for="group in [{ key: 'plan', list: report.plan }, { key: 'work', list: report.work }]" :key="group.key">
      <h4 class="mb-1.5 text-xs font-medium">{{ t(group.key === 'plan' ? 'report.tools.plan' : 'report.tools.work') }}</h4>
      <ul class="space-y-1.5">
        <li v-for="tool in group.list" :key="tool.name" class="text-sm">
          <span class="font-mono text-xs font-medium">{{ tool.name }}</span>
          <span v-if="tool.description" class="text-muted-foreground block text-xs leading-snug">{{ tool.description }}</span>
        </li>
      </ul>
    </section>

    <section>
      <h4 class="mb-1.5 text-xs font-medium">{{ t('report.tools.external') }}</h4>
      <p v-if="!report.externalToolsEnabled" class="text-muted-foreground text-sm">{{ t('report.tools.disabled') }}</p>
      <ul v-else class="space-y-2">
        <li v-for="tool in report.external" :key="`${tool.set}/${tool.name}`" class="text-sm">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-mono text-xs font-medium">{{ tool.name }}</span>
            <Badge variant="outline">{{ catalogs(tool) }}</Badge>
            <Badge variant="secondary">{{ tool.effectiveApproval }}</Badge>
          </div>
          <span class="text-muted-foreground text-xs">{{ t('report.tools.set', { set: tool.set, source: tool.source }) }}</span>
        </li>
      </ul>
      <p class="text-muted-foreground mt-2 text-xs">
        {{ t('report.tools.approval', { home: report.externalApproval.home, project: report.externalApproval.project }) }}
      </p>
      <ul v-if="report.externalNotes.length" class="text-muted-foreground mt-2 list-disc space-y-0.5 pl-4 text-xs">
        <li v-for="(note, index) in report.externalNotes" :key="index">{{ note }}</li>
      </ul>
    </section>
  </div>
</template>
