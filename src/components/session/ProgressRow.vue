<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Loader2 } from '@lucide/vue'
import { server } from '@/app/server'
import { t } from '@/i18n'
import { describeProgress, formatElapsed } from '@/session/progress'
import { useConversationWidth } from '@/composables/conversation-width'

const model = server.model
const { fullWidth } = useConversationWidth()

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
  <!-- One line, and it must not grow. A wrapping status is a flex item in the
       session column; its content height would take the transcript's space,
       leave a sliver of the conversation, and make scrolling jump. The full
       line is in the tooltip. A long retry reason also stays on the live round.
       Only the text is a live region. The timer sits outside it so a screen
       reader is not told the time every second. -->
  <div v-if="progress" class="conv-column text-muted-foreground flex w-full shrink-0 items-center gap-2 overflow-hidden py-1 text-sm" :data-full="fullWidth ? '' : undefined">
    <Loader2 class="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
    <span role="status" aria-live="polite" class="min-w-0 flex-1 truncate" :title="text">{{ text }}</span>
    <span class="shrink-0 font-mono text-xs tabular-nums" :title="t('progress.elapsed')">{{ elapsed }}</span>
  </div>
</template>
