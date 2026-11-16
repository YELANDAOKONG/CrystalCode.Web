<script setup lang="ts">
import { t, type MessageKey } from '@/i18n'
import { Badge } from '@/components/ui/badge'

// A titled block of settings. The badge says where a change lands, so one tab
// can hold server and browser settings without the operator guessing.
defineProps<{ title: string; help?: string; scope?: 'server' | 'browser' }>()

const SCOPE: Record<'server' | 'browser', MessageKey> = {
  server: 'settings.scope.server',
  browser: 'settings.scope.browser',
}
</script>

<template>
  <section class="min-w-0">
    <header class="flex items-center justify-between gap-3 border-b pb-2">
      <h3 class="text-sm font-semibold">{{ title }}</h3>
      <Badge v-if="scope" variant="outline" class="text-muted-foreground shrink-0">{{ t(SCOPE[scope]) }}</Badge>
    </header>
    <p v-if="help" class="text-muted-foreground mt-2 text-xs leading-snug">{{ help }}</p>
    <div class="divide-y"><slot /></div>
  </section>
</template>
