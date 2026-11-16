<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, Sparkles } from '@lucide/vue'
import MarkdownView from '@/components/render/MarkdownView.vue'
import { t } from '@/i18n'

const props = defineProps<{
  text: string
  streaming?: boolean
  // The server preference that opens thinking by default.
  defaultOpen: boolean
  // Newer thinking has arrived and the setting asks earlier blocks to fold.
  folded: boolean
}>()

// null until the reader toggles the block. A manual choice always wins.
const manual = ref<boolean | null>(null)
const open = computed(() => manual.value ?? (props.defaultOpen && !props.folded))
</script>

<template>
  <details class="group text-sm" :open="open">
    <summary
      class="text-muted-foreground flex cursor-pointer list-none items-center gap-2"
      @click.prevent="manual = !open"
    >
      <ChevronRight class="size-4 transition-transform group-open:rotate-90" />
      <Sparkles class="size-4" />
      {{ t('session.reasoning') }}
    </summary>
    <div class="text-muted-foreground mt-1 border-l-2 pl-4"><MarkdownView :source="text" :streaming="streaming" /></div>
  </details>
</template>
