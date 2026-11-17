<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, Wrench } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n'
import { displayToken } from '@/session/display-case'
import { argumentSummary, prettyArguments, type ToolResult } from '@/session/blocks'
import type { ToolCall } from '@/protocol/types'
import ImageStrip from './ImageStrip.vue'

const props = defineProps<{
  call: ToolCall
  result: ToolResult | null
  running?: boolean
  // One quiet line instead of a bordered card, for a call that stands alone.
  quiet?: boolean
  // Open until the reader decides otherwise: this is the newest call.
  defaultOpen?: boolean
}>()

// null until the reader toggles the call. A manual choice always wins.
const manual = ref<boolean | null>(null)
const open = computed(() => manual.value ?? props.defaultOpen ?? false)

const input = computed(() => prettyArguments(props.call.arguments))
const summary = computed(() => argumentSummary(props.call.arguments))
const failed = computed(() => (props.result ? /error|fail|denied|reject|timeout|cancel/i.test(props.result.status) : false))
</script>

<template>
  <details class="group text-sm" :class="quiet ? '' : 'bg-card my-2 rounded-lg border'" :open="open">
    <summary
      class="focus-visible:ring-ring flex cursor-pointer list-none items-center gap-2 outline-none focus-visible:ring-2"
      :class="quiet ? 'text-muted-foreground hover:text-foreground rounded-md py-1' : 'rounded-lg px-3 py-2'"
      @click.prevent="manual = !open"
    >
      <ChevronRight class="size-4 shrink-0 transition-transform group-open:rotate-90" :class="quiet ? '' : 'text-muted-foreground'" />
      <Wrench class="size-4 shrink-0" :class="quiet ? '' : 'text-muted-foreground'" />
      <span class="font-mono font-medium" :class="quiet ? '' : 'text-foreground'">{{ call.name || t('session.tool.orphan') }}</span>
      <span class="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">{{ summary }}</span>
      <Badge v-if="result" :variant="failed ? 'destructive' : 'secondary'">{{ displayToken(result.status) }}</Badge>
      <Badge v-else-if="running" variant="outline">{{ t('session.tool.running') }}</Badge>
    </summary>
    <div class="space-y-2 px-3 py-2" :class="quiet ? 'bg-card mt-1 ml-2 rounded-lg border' : 'border-t'">
      <div v-if="input">
        <div class="text-muted-foreground mb-1 text-xs">{{ t('session.tool.input') }}</div>
        <pre class="bg-muted max-h-64 overflow-auto rounded-md p-2 font-mono text-xs wrap-anywhere whitespace-pre-wrap">{{ input }}</pre>
      </div>
      <div v-if="result">
        <div class="text-muted-foreground mb-1 text-xs">{{ t('session.tool.output') }}</div>
        <pre
          v-if="result.text"
          class="bg-muted max-h-80 overflow-auto rounded-md p-2 font-mono text-xs wrap-anywhere whitespace-pre-wrap"
        >{{ result.text }}</pre>
        <ImageStrip v-if="result.images.length" :numbers="result.images" class="mt-2" />
      </div>
    </div>
  </details>
</template>
