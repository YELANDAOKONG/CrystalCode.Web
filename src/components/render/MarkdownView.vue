<script setup lang="ts">
import { computed } from 'vue'
import { parseMarkdown } from '@/render/markdown'
import MarkdownNodes from './MarkdownNodes.vue'

const props = defineProps<{ source: string; streaming?: boolean }>()

const nodes = computed(() => parseMarkdown(props.source))
</script>

<template>
  <div class="md">
    <MarkdownNodes :nodes="nodes" :streaming="streaming ?? false" />
  </div>
</template>
