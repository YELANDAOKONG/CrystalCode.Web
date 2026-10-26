<script setup lang="ts">
import { computed, ref } from 'vue'
import { server } from '@/app/server'
import { t } from '@/i18n'
import Composer from './Composer.vue'
import InteractionDialog from './InteractionDialog.vue'
import SessionHeader from './SessionHeader.vue'
import SidePanel from './SidePanel.vue'
import StatusBar from './StatusBar.vue'
import Transcript from './Transcript.vue'

const model = server.model
const { phase, retryIn, waitingState } = server

const panelOpen = ref(false)
const current = computed(() => model.interactions[0])

const banner = computed(() => {
  if (phase.value === 'reconnecting') {
    const wait = retryIn.value
    return t('banner.reconnecting', { in: wait ? t('banner.reconnecting.in', { seconds: wait }) : '' })
  }

  if (phase.value === 'closed') {
    return model.server.closing?.saved ? t('banner.closed.saved') : t('banner.closed')
  }

  return waitingState.value ? t('banner.waiting', { state: waitingState.value }) : null
})
</script>

<template>
  <div class="flex h-dvh flex-col">
    <SessionHeader :panel-open="panelOpen" @toggle-panel="panelOpen = !panelOpen" />
    <p v-if="banner" role="status" class="bg-muted text-muted-foreground border-b px-4 py-1.5 text-sm">{{ banner }}</p>
    <div class="flex min-h-0 flex-1">
      <main class="flex min-w-0 flex-1 flex-col">
        <Transcript />
        <Composer />
        <StatusBar />
      </main>
      <SidePanel v-if="panelOpen" class="hidden md:block" />
    </div>
    <InteractionDialog v-if="current" :key="current.id" :interaction="current" :waiting="model.interactions.length - 1" />
  </div>
</template>
