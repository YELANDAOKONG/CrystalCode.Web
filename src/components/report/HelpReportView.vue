<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import { parseHelpReport } from '@/protocol/parse'
import type { SlashCommand } from '@/protocol/types'

const props = defineProps<{ data: Record<string, unknown> }>()

const report = computed(() => parseHelpReport(props.data))

// Aliases come first in `keys`; show the extras after the canonical name.
const aliases = (command: SlashCommand) => command.keys.filter((key) => key !== command.name)
</script>

<template>
  <div class="space-y-4">
    <section v-for="group in [{ id: 'built', list: report.builtIn, title: '' }, { id: 'plug', list: report.plugins, title: t('report.help.plugins') }]" :key="group.id">
      <h4 v-if="group.list.length && group.title" class="mb-1.5 text-xs font-medium">{{ group.title }}</h4>
      <ul v-if="group.list.length" class="space-y-1.5">
        <li v-for="command in group.list" :key="command.name" class="grid grid-cols-[minmax(5.5rem,max-content)_1fr] gap-x-4 text-sm">
          <span class="font-mono text-xs leading-5">
            /{{ command.name }}<span v-for="alias in aliases(command)" :key="alias" class="text-muted-foreground"> /{{ alias }}</span>
          </span>
          <span class="text-muted-foreground">{{ command.help }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
