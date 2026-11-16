<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, Layers } from '@lucide/vue'
import { t } from '@/i18n'

const props = defineProps<{
  thinking: number
  tools: number
  // Open until the reader decides otherwise: this is the newest run.
  defaultOpen: boolean
}>()

// null until the reader toggles the run. A manual choice always wins.
const manual = ref<boolean | null>(null)
const open = computed(() => manual.value ?? props.defaultOpen)

const counts = computed(() =>
  [
    props.thinking > 0 ? t('session.process.thinking', { count: props.thinking }) : '',
    props.tools > 0 ? t('session.tool.group', { count: props.tools }) : '',
  ]
    .filter((part) => part !== '')
    .join(' · '),
)
</script>

<template>
  <details class="group text-sm" :open="open">
    <summary
      class="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex cursor-pointer list-none items-center gap-2 rounded-md py-1 outline-none focus-visible:ring-2"
      @click.prevent="manual = !open"
    >
      <ChevronRight class="size-4 shrink-0 transition-transform group-open:rotate-90" />
      <Layers class="size-4 shrink-0" />
      <span class="font-medium">{{ t('session.process') }}</span>
      <span class="min-w-0 flex-1 truncate text-xs">{{ counts }}</span>
    </summary>
    <div class="mt-1 ml-2 flex min-w-0 flex-col gap-2 border-l pl-3">
      <slot />
    </div>
  </details>
</template>
