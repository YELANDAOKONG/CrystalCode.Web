<script setup lang="ts">
import { isSafeLink, type MdNode } from '@/render/markdown'
import CodeBlock from './CodeBlock.vue'

defineProps<{ nodes: MdNode[]; streaming: boolean }>()
</script>

<template>
  <template v-for="(node, index) in nodes" :key="index">
    <template v-if="node.type === 'text'">{{ node.value }}</template>
    <code v-else-if="node.type === 'code'">{{ node.value }}</code>
    <CodeBlock v-else-if="node.type === 'fence'" :lang="node.lang" :value="node.value" :streaming="streaming" />
    <br v-else-if="node.type === 'br'" />
    <hr v-else-if="node.type === 'hr'" />
    <a
      v-else-if="node.tag === 'a' && node.href && isSafeLink(node.href)"
      :href="node.href"
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      <MarkdownNodes :nodes="node.children" :streaming="streaming" />
    </a>
    <span v-else-if="node.tag === 'a'">
      <MarkdownNodes :nodes="node.children" :streaming="streaming" />
    </span>
    <div v-else-if="node.tag === 'table'" class="md-table">
      <table><MarkdownNodes :nodes="node.children" :streaming="streaming" /></table>
    </div>
    <ol v-else-if="node.tag === 'ol'" :start="node.start">
      <MarkdownNodes :nodes="node.children" :streaming="streaming" />
    </ol>
    <component :is="node.tag" v-else>
      <MarkdownNodes :nodes="node.children" :streaming="streaming" />
    </component>
  </template>
</template>
