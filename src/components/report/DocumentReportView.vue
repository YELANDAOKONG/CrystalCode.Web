<script setup lang="ts">
import { computed } from 'vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { t } from '@/i18n'
import { parseDocument } from '@/protocol/parse'
import ReportRows from './ReportRows.vue'

// A titled document written by a slash command or a plugin. The server sends
// plain strings in four block types; every cell is drawn as text. An unknown
// block type falls back to its lines so a new type never hides content.
const props = defineProps<{ data: Record<string, unknown> }>()

const blocks = computed(() => parseDocument(props.data).blocks)
</script>

<template>
  <div class="space-y-4">
    <p v-if="blocks.length === 0" class="text-muted-foreground">{{ t('report.none') }}</p>
    <section v-for="(block, index) in blocks" :key="index" class="space-y-1.5">
      <ReportRows
        v-if="block.type === 'keyValues'"
        :rows="block.rows.map((row) => ({ label: row[0] ?? '', value: row[1] ?? '' }))"
      />
      <Table v-else-if="block.type === 'table'">
        <TableHeader>
          <TableRow>
            <TableHead v-for="(column, c) in block.columns" :key="c">{{ column }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(row, r) in block.rows" :key="r">
            <TableCell v-for="(cell, c) in row" :key="c" class="align-top break-words whitespace-normal">{{ cell }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <ul v-else-if="block.type === 'list'" class="list-disc space-y-0.5 pl-4 text-sm">
        <li v-for="(line, l) in block.lines" :key="l" class="break-words">{{ line }}</li>
      </ul>
      <template v-else>
        <p v-for="(line, l) in block.lines" :key="l" class="text-sm break-words whitespace-pre-wrap">{{ line }}</p>
      </template>
      <p v-if="block.omitted > 0" class="text-muted-foreground text-xs">{{ t('report.document.omitted', { count: block.omitted }) }}</p>
    </section>
  </div>
</template>
