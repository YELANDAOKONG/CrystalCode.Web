<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { server } from '@/app/server'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { t } from '@/i18n'
import SettingsView from '@/components/settings/SettingsView.vue'
import StatsWindow from '@/components/report/StatsWindow.vue'
import Composer from './Composer.vue'
import InteractionDialog from './InteractionDialog.vue'
import ProgressRow from './ProgressRow.vue'
import SessionHeader from './SessionHeader.vue'
import SidePanel from './SidePanel.vue'
import StatusBar from './StatusBar.vue'
import Transcript from './Transcript.vue'

const model = server.model
const { phase, retryIn, waitingState } = server

const panelOpen = ref(false)
const settingsOpen = ref(false)
const wide = useMediaQuery('(min-width: 768px)')
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
    <SessionHeader :panel-open="panelOpen" @toggle-panel="panelOpen = !panelOpen" @open-settings="settingsOpen = true" />
    <p v-if="banner" role="status" class="bg-muted text-muted-foreground border-b px-4 py-1.5 text-sm">{{ banner }}</p>
    <div class="flex min-h-0 flex-1">
      <main class="flex min-w-0 flex-1 flex-col">
        <Transcript />
        <ProgressRow />
        <Composer />
        <StatusBar />
      </main>
      <aside v-if="panelOpen && wide" class="bg-card w-80 shrink-0 overflow-y-auto border-l p-4">
        <SidePanel />
      </aside>
    </div>
    <Sheet v-if="!wide" v-model:open="panelOpen">
      <SheetContent side="bottom" class="max-h-[80dvh] overflow-y-auto rounded-t-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader class="px-0">
          <SheetTitle>{{ t('header.panel') }}</SheetTitle>
          <SheetDescription class="sr-only">{{ t('header.panel') }}</SheetDescription>
        </SheetHeader>
        <SidePanel />
      </SheetContent>
    </Sheet>
    <SettingsView v-model:open="settingsOpen" />
    <StatsWindow />
    <InteractionDialog v-if="current" :key="current.id" :interaction="current" :waiting="model.interactions.length - 1" />
  </div>
</template>
