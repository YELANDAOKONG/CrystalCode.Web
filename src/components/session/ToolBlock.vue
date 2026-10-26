<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, Wrench } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n'
import { displayToken } from '@/session/display-case'
import { argumentSummary, prettyArguments, type ToolResult } from '@/session/blocks'
import type { ToolCall } from '@/protocol/types'
import ServerImage from './ServerImage.vue'

const props = defineProps<{ call: ToolCall; result: ToolResult | null; running?: boolean }>()

const input = computed(() => prettyArguments(props.call.arguments))
const summary = computed(() => argumentSummary(props.call.arguments))
const failed = computed(() => (props.result ? /error|fail|denied|reject|timeout|cancel/i.test(props.result.status) : false))
</script>

<template>
  <details class="group bg-card my-2 rounded-lg border text-sm">
    <summary
      class="focus-visible:ring-ring flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 outline-none focus-visible:ring-2"
    >
      <ChevronRight class="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-90" />
      <Wrench class="text-muted-foreground size-4 shrink-0" />
      <span class="font-mono font-medium">{{ call.name || t('session.tool.orphan') }}</span>
      <span class="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">{{ summary }}</span>
      <Badge v-if="result" :variant="failed ? 'destructive' : 'secondary'">{{ displayToken(result.status) }}</Badge>
      <Badge v-else-if="running" variant="outline">{{ t('session.tool.running') }}</Badge>
    </summary>
    <div class="space-y-2 border-t px-3 py-2">
      <div v-if="input">
        <div class="text-muted-foreground mb-1 text-xs">{{ t('session.tool.input') }}</div>
        <pre class="bg-muted max-h-64 overflow-auto rounded-md p-2 font-mono text-xs whitespace-pre-wrap">{{ input }}</pre>
      </div>
      <div v-if="result">
        <div class="text-muted-foreground mb-1 text-xs">{{ t('session.tool.output') }}</div>
        <pre
          v-if="result.text"
          class="bg-muted max-h-80 overflow-auto rounded-md p-2 font-mono text-xs whitespace-pre-wrap"
        >{{ result.text }}</pre>
        <div v-if="result.images.length" class="mt-2 flex flex-wrap gap-2">
          <ServerImage v-for="number in result.images" :key="number" :number="number" />
        </div>
      </div>
    </div>
  </details>
</template>
