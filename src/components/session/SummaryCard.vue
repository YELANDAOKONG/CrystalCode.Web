<script setup lang="ts">
import MarkdownView from '@/components/render/MarkdownView.vue'
import { t } from '@/i18n'

defineProps<{ text: string }>()
</script>

<template>
  <section class="rounded-xl border px-4 py-3" :aria-label="t('session.summary')">
    <div class="text-muted-foreground mb-1 text-xs font-medium">{{ t('session.summary') }}</div>
    <MarkdownView :source="text" />
  </section>
</template>
