<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { server } from '@/app/server'
import ProblemToaster from '@/components/common/ProblemToaster.vue'
import ConnectView from '@/components/connect/ConnectView.vue'
import SessionView from '@/components/session/SessionView.vue'
import { useTitleSetting } from '@/composables/page-title'
import { t } from '@/i18n'

const showSession = computed(() => ['live', 'reconnecting', 'closed'].includes(server.phase.value))
const { titleSetting } = useTitleSetting()

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
    if (server.model.chrome?.topic) parts.push(server.model.chrome.topic)
  } else {
    parts.push(t('title.connect'))
  }

  parts.push('Crystal Code')
  document.title = parts.join(' · ')
})
</script>

<template>
  <SessionView v-if="showSession" />
  <ConnectView v-else />
  <ProblemToaster />
</template>
