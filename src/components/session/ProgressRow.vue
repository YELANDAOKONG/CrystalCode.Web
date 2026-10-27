<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Loader2 } from '@lucide/vue'
import { server } from '@/app/server'
import { t } from '@/i18n'
import { describeProgress, formatElapsed } from '@/session/progress'

const model = server.model

// A once-a-second clock drives both the elapsed time and the retry countdown.
// It runs only while there is a step to show.
const now = ref(Date.now())
const progress = computed(() => describeProgress(model.step, model.interactions, now.value))
const since = ref(Date.now())

let timer: ReturnType<typeof setInterval> | undefined
function stop(): void {
  clearInterval(timer)
  timer = undefined
}

// The elapsed time starts over whenever the wording changes, as in the terminal.
watch(
  () => progress.value?.id ?? null,
  (id) => {
    if (id === null) return stop()
    since.value = Date.now()
    now.value = since.value
    if (timer === undefined) timer = setInterval(() => (now.value = Date.now()), 1000)
  },
  { immediate: true },
)

onBeforeUnmount(stop)

const text = computed(() => {
  const line = progress.value
  if (!line) return ''
  const label = t(line.key, line.params)
  return line.countdown === null ? label : `${label}, ${formatElapsed(line.countdown)}`
})

const elapsed = computed(() => formatElapsed(now.value - since.value))
</script>

<template>
  <!-- Only the text is a live region. The timer sits outside it so a screen
       reader is not told the time every second. -->
  <div v-if="progress" class="text-muted-foreground mx-auto flex w-full max-w-3xl items-center gap-2 px-4 pb-1 text-sm md:px-5">
    <Loader2 class="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
    <span role="status" aria-live="polite">{{ text }}</span>
    <span class="font-mono text-xs" :title="t('progress.elapsed')">{{ elapsed }}</span>
  </div>
</template>
