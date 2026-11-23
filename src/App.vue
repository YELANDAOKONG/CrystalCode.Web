<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { server } from '@/app/server'
import ProblemToaster from '@/components/common/ProblemToaster.vue'
import ConnectView from '@/components/connect/ConnectView.vue'
import ThemeEffects from '@/components/ambient/ThemeEffects.vue'
import SessionView from '@/components/session/SessionView.vue'
import { useTitleSetting } from '@/composables/page-title'
import { t } from '@/i18n'

const showSession = computed(() => ['live', 'reconnecting', 'closed'].includes(server.phase.value))
// Keep the idle particles mounted while the first snapshot is loading.
const idle = computed(() => !showSession.value || !server.model.loaded || server.model.conversation.length === 0)
const { titleSetting } = useTitleSetting()

const TITLE_TEXT_LIMIT = 80
const titleSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
function titleText(value: string): string {
  // Preserve word boundaries before removing controls. Keep joiners and variation
  // selectors: they are needed by scripts and combined emoji.
  const text = value
    .replace(/\s+/g, ' ')
    .replace(/[\p{Cc}\p{Cs}\u00ad\u061c\u200b\u200e\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, '')
    .trim()
  const characters: string[] = []
  for (const { segment } of titleSegmenter.segment(text)) {
    characters.push(segment)
    if (characters.length > TITLE_TEXT_LIMIT) {
      return `${characters.slice(0, TITLE_TEXT_LIMIT - 1).join('')}…`
    }
  }
  return text
}

const sessionTitle = computed(() => {
  const topic = titleText(server.model.chrome?.topic ?? '')
  if (topic) return topic
  const first = server.model.conversation.find((item) => item.kind === 'message' && item.role === 'user')
  return first?.kind === 'message' ? titleText(first.text) : ''
})

watchEffect(() => {
  if (titleSetting.value === 'fixed') {
    document.title = 'Crystal Code'
    return
  }

  const parts: string[] = []
  if (showSession.value) {
    if (server.phase.value === 'reconnecting') parts.push(t('title.reconnecting'))
    else if (server.phase.value === 'closed') parts.push(t('title.closed'))
    else if (server.model.interactions.length) parts.push(t('title.attention'))
    if (sessionTitle.value) parts.push(sessionTitle.value)
  } else {
    parts.push(t('title.connect'))
  }

  parts.push('Crystal Code')
  document.title = parts.join(' · ')
})
</script>

<template>
  <SessionView v-if="showSession" />
  <ConnectView v-else-if="!server.starting.value" />
  <ProblemToaster />
  <ThemeEffects :idle="idle" />
</template>
