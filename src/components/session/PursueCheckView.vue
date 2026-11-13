<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { server } from '@/app/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { t } from '@/i18n'
import type { PursueCheck } from '@/protocol/types'
import { pursueLabel } from './pursue-label'

const props = defineProps<{ check: PursueCheck }>()
const expanded = ref(false)
const detail = ref(props.check)
const loading = ref(false)
const failed = ref(false)
let request: AbortController | undefined
watch(() => props.check, (check) => (detail.value = check))
onBeforeUnmount(() => request?.abort())

async function refresh(): Promise<void> {
  if (loading.value) return
  const controller = new AbortController()
  request = controller
  loading.value = true
  failed.value = false
  const result = await server.loadPursueCheck(props.check.id, controller.signal)
  if (controller.signal.aborted) return
  if (result?.id === props.check.id && result.objectiveId === props.check.objectiveId) detail.value = result
  else failed.value = true
  loading.value = false
}

function when(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}
</script>

<template>
  <details class="min-w-0 border-b py-3" @toggle="expanded = ($event.target as HTMLDetailsElement).open">
    <summary class="focus-visible:ring-ring cursor-pointer rounded-sm py-2 text-sm outline-none focus-visible:ring-2">
      <span class="inline-flex max-w-full flex-wrap items-center gap-2 align-middle">
        <span class="font-medium">{{ t('pursue.check', { index: check.index }) }}</span>
        <Badge :variant="check.verdict === 'failed' || check.verdict === 'blocked' ? 'destructive' : 'secondary'">{{ pursueLabel('verdict', check.verdict) }}</Badge>
        <time class="text-muted-foreground text-xs" :datetime="check.checkedUtc">{{ when(check.checkedUtc) }}</time>
      </span>
    </summary>
    <div v-if="expanded" class="flex min-w-0 flex-col gap-3 pt-3 text-sm">
      <p class="text-muted-foreground break-all text-xs">{{ t('pursue.runId') }}: <span class="select-text font-mono">{{ detail.runId }}</span></p>
      <p class="text-muted-foreground break-all text-xs">{{ t('pursue.checkId') }}: <span class="select-text font-mono">{{ detail.id }}</span></p>
      <p v-if="detail.reason" class="whitespace-pre-wrap break-words">{{ detail.reason }}</p>
      <section v-if="detail.nextStep">
        <h3 class="mb-1 font-medium">{{ t('pursue.nextStep') }}</h3>
        <p class="whitespace-pre-wrap break-words">{{ detail.nextStep }}</p>
      </section>
      <p v-if="detail.waitFor.length" class="break-all">{{ t('pursue.waitFor') }}: <span class="font-mono">{{ detail.waitFor.join(', ') }}</span></p>
      <p v-if="detail.usage" class="text-muted-foreground text-xs">{{ t('child.usage') }}: {{ detail.usage.inputTokens }} IN / {{ detail.usage.outputTokens }} OUT</p>
      <section>
        <h3 class="mb-2 font-medium">{{ t('pursue.evidence') }}</h3>
        <p v-if="!detail.evidenceContent.length" class="text-muted-foreground">{{ t('pursue.noEvidence') }}</p>
        <details v-for="entry in detail.evidenceContent" :key="entry.number" class="mb-2 min-w-0 rounded-md border p-2">
          <summary class="focus-visible:ring-ring cursor-pointer break-words py-1 outline-none focus-visible:ring-2">[{{ entry.number }}] {{ entry.kind }}</summary>
          <pre class="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-xs" tabindex="0">{{ entry.text }}</pre>
        </details>
      </section>
      <p v-if="failed" role="alert" class="text-destructive">{{ t('pursue.checkFailed') }}</p>
      <Button v-if="server.can('GET /pursue/checks/{id}')" variant="outline" size="sm" class="self-start" :disabled="loading || server.phase.value !== 'live'" @click="refresh">
        <Spinner v-if="loading" class="motion-reduce:animate-none" />{{ t('pursue.refreshCheck') }}
      </Button>
    </div>
  </details>
</template>
