<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'

// The frame every catalog tab shares: actions and a refresh button on top,
// then a skeleton, an empty message, or the content.
defineProps<{ loading: boolean; failed: boolean; empty: boolean; emptyText: string }>()
const emit = defineEmits<{ refresh: [] }>()
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2"><slot name="actions" /></div>
      <Button
        variant="ghost"
        size="icon"
        class="size-10 md:size-9"
        :disabled="loading"
        :aria-label="t('catalog.refresh')"
        :title="t('catalog.refresh')"
        @click="emit('refresh')"
      >
        <RefreshCw class="size-4" :class="loading ? 'animate-spin motion-reduce:animate-none' : ''" />
      </Button>
    </div>
    <slot name="summary" />
    <div v-if="empty && loading" class="space-y-3" aria-hidden="true">
      <Skeleton class="h-12 w-full" />
      <Skeleton class="h-12 w-full" />
      <Skeleton class="h-12 w-2/3" />
    </div>
    <p v-else-if="empty" class="text-muted-foreground py-6 text-center text-sm">
      {{ failed ? t('catalog.failed') : emptyText }}
    </p>
    <slot v-else />
    <slot name="footer" />
  </div>
</template>
