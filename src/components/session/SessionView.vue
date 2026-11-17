<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@vueuse/core'
import { server } from '@/app/server'
import { loadPreference, savePreference } from '@/connection/storage'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { t, type MessageKey } from '@/i18n'
import { displayToken } from '@/session/display-case'
import CatalogView from '@/components/catalog/CatalogView.vue'
import SettingsView from '@/components/settings/SettingsView.vue'
import StatsWindow from '@/components/report/StatsWindow.vue'
import Composer from './Composer.vue'
import InteractionDialog from './InteractionDialog.vue'
import ProgressRow from './ProgressRow.vue'
import PursueSheet from './PursueSheet.vue'
import SessionHeader from './SessionHeader.vue'
import SidePanel from './SidePanel.vue'
import StatusBar from './StatusBar.vue'
import Transcript from './Transcript.vue'

const model = server.model
const { phase, retryIn, waitingState } = server

const desktopPanelOpen = ref(loadPreference('desktop-panel') === 'open')
const mobilePanelOpen = ref(false)
const settingsOpen = ref(false)
const catalogOpen = ref(false)
const pursueOpen = ref(false)
const wide = useMediaQuery('(min-width: 768px)')
const panelOpen = computed({
  get: () => (wide.value ? desktopPanelOpen.value : mobilePanelOpen.value),
  set: (open: boolean) => {
    if (wide.value) {
      desktopPanelOpen.value = open
      savePreference('desktop-panel', open ? 'open' : 'closed')
    } else {
      mobilePanelOpen.value = open
    }
  },
})
const current = computed(() => model.interactions[0])
const interactionOpen = ref(false)
const interactionTrigger = ref<InstanceType<typeof Button> | null>(null)
const main = ref<HTMLElement | null>(null)
watch(() => current.value?.id, (id) => { interactionOpen.value = id !== undefined }, { immediate: true })
function focusInteraction(): void {
  if (interactionOpen.value && current.value) return
  const trigger = interactionTrigger.value?.$el as HTMLElement | undefined
  const target = trigger ?? main.value
  target?.focus()
}

function openPursue(): void {
  if (!wide.value) panelOpen.value = false
  pursueOpen.value = true
}

const SERVER_STATES = new Set(['starting', 'awaiting_operator', 'ready', 'closing', 'failed'])

function serverStateLabel(state: string): string {
  return SERVER_STATES.has(state) ? t(`banner.state.${state}` as MessageKey) : displayToken(state)
}

const banner = computed(() => {
  if (phase.value === 'reconnecting') {
    const wait = retryIn.value
    return t('banner.reconnecting', { in: wait ? t('banner.reconnecting.in', { seconds: wait }) : '' })
  }

  if (phase.value === 'closed') {
    return model.server.closing?.saved ? t('banner.closed.saved') : t('banner.closed')
  }

  return waitingState.value ? t('banner.waiting', { state: serverStateLabel(waitingState.value) }) : null
})
</script>

<template>
  <!-- The page itself does not scroll. The transcript does. A content-sized
       child here would stretch the column past the viewport. -->
  <div class="flex h-dvh flex-col overflow-hidden">
    <SessionHeader :panel-open="panelOpen" @toggle-panel="panelOpen = !panelOpen" @open-settings="settingsOpen = true" @open-catalog="catalogOpen = true" />
    <p v-if="banner" role="status" class="bg-muted text-muted-foreground shrink-0 border-b px-4 py-1.5 text-sm">{{ banner }}</p>
    <div v-if="current" class="bg-muted flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
      <p role="status" class="min-w-0 text-sm">{{ t('interaction.pending') }}</p>
      <Button ref="interactionTrigger" variant="outline" size="sm" class="shrink-0" @click="interactionOpen = true">{{ t('interaction.open') }}</Button>
    </div>
    <div class="flex min-h-0 flex-1">
      <main ref="main" tabindex="-1" class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Transcript />
        <ProgressRow />
        <Composer />
      </main>
      <aside v-if="panelOpen && wide" class="bg-card w-80 min-h-0 shrink-0 overflow-y-auto border-l p-4">
        <SidePanel @open-pursue="openPursue" />
      </aside>
    </div>
    <StatusBar />
    <PursueSheet v-model:open="pursueOpen" />
    <Sheet v-if="!wide" v-model:open="panelOpen">
      <SheetContent side="bottom" class="max-h-[80dvh] overflow-y-auto rounded-t-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader class="px-0">
          <SheetTitle>{{ t('header.panel') }}</SheetTitle>
          <SheetDescription class="sr-only">{{ t('header.panel') }}</SheetDescription>
        </SheetHeader>
        <SidePanel @open-pursue="openPursue" />
      </SheetContent>
    </Sheet>
    <SettingsView v-model:open="settingsOpen" />
    <CatalogView v-if="catalogOpen" v-model:open="catalogOpen" />
    <StatsWindow />
    <InteractionDialog v-if="current" :key="current.id" v-model:open="interactionOpen" :interaction="current" :waiting="model.interactions.length - 1" @hidden="focusInteraction" />
  </div>
</template>
