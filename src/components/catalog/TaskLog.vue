<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { server } from '@/app/server'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { t } from '@/i18n'
import type { BackgroundTask } from '@/protocol/types'

// A task's log is read in chunks. The log is bounded, so the start may have
// moved on; begin at the task's own `logStartOffset`. The text is shown as
// plain text and never interpreted.
const props = defineProps<{ task: BackgroundTask }>()

const text = ref('')
const next = ref(props.task.logStartOffset)
const more = ref(false)
const loading = ref(false)
const empty = ref(false)

async function read(): Promise<void> {
  loading.value = true
  const chunk = await server.loadTaskLog(props.task.id, next.value)
  loading.value = false
  if (!chunk) return
  text.value += chunk.text
  next.value = chunk.nextOffset
  more.value = chunk.hasMore
  empty.value = text.value === ''
}

onMounted(read)
</script>

<template>
  <div class="space-y-2">
    <pre
      v-if="text"
      tabindex="0"
      class="bg-muted max-h-72 overflow-auto rounded-md border p-2 font-mono text-xs leading-5 break-words whitespace-pre-wrap"
      :aria-label="t('catalog.tasks.log')"
    >{{ text }}</pre>
    <p v-else-if="empty && !loading" class="text-muted-foreground text-xs">{{ t('catalog.tasks.logEmpty') }}</p>
    <div class="flex items-center gap-2">
      <Button variant="outline" size="sm" class="h-10 md:h-8" :disabled="loading" @click="read">
        <Spinner v-if="loading" class="size-3.5" />
        {{ more ? t('catalog.tasks.more') : t('catalog.tasks.check') }}
      </Button>
    </div>
  </div>
</template>
