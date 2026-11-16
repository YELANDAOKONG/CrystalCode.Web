<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, Wrench } from '@lucide/vue'
import { t } from '@/i18n'
import type { ToolEntry } from '@/session/blocks'
import ToolBlock from './ToolBlock.vue'

const props = defineProps<{
  calls: ToolEntry[]
  // Open until the reader decides otherwise: this holds the newest call.
  defaultOpen?: boolean
}>()

// null until the reader toggles the group. A manual choice always wins.
const manual = ref<boolean | null>(null)
const open = computed(() => manual.value ?? props.defaultOpen ?? false)

const names = computed(() => [...new Set(props.calls.map((entry) => entry.call.name).filter((name) => name !== ''))].join(', '))
const pending = computed(() => props.calls.filter((entry) => entry.result === null).length)
</script>

<template>
  <details class="group text-sm" :open="open">
    <summary
      class="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex cursor-pointer list-none items-center gap-2 rounded-md py-1 outline-none focus-visible:ring-2"
      @click.prevent="manual = !open"
    >
      <ChevronRight class="size-4 shrink-0 transition-transform group-open:rotate-90" />
      <Wrench class="size-4 shrink-0" />
      <span class="font-medium">{{ calls.length === 1 ? t('session.tool.groupOne') : t('session.tool.group', { count: calls.length }) }}</span>
      <span class="min-w-0 flex-1 truncate font-mono text-xs">{{ names }}</span>
      <span v-if="pending" class="shrink-0 text-xs">{{ t('session.tool.running') }}</span>
    </summary>
    <div class="mt-1 ml-2 border-l pl-3">
      <ToolBlock v-for="entry in calls" :key="entry.key" :call="entry.call" :result="entry.result" />
    </div>
  </details>
</template>
