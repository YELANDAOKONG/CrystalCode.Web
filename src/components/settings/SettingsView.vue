<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { server } from '@/app/server'
import { loadPreference, savePreference } from '@/connection/storage'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { t } from '@/i18n'
import DisplaySettings from './DisplaySettings.vue'
import InterfaceSettings from './InterfaceSettings.vue'
import ServerSettings from './ServerSettings.vue'
import SessionSettings from './SessionSettings.vue'

const open = defineModel<boolean>('open', { required: true })
const wide = useMediaQuery('(min-width: 768px)')

const TABS = [
  ['session', 'settings.tab.session'],
  ['display', 'settings.tab.display'],
  ['interface', 'settings.tab.interface'],
  ['server', 'settings.tab.server'],
] as const
const saved = loadPreference('settings-tab')
const tab = ref(TABS.some(([id]) => id === saved) ? (saved as string) : 'session')
const list = ref<{ $el: HTMLElement } | null>(null)

// A phone shows the tabs in a scrolling row, so bring the chosen one into view.
watch(tab, (id) => {
  savePreference('settings-tab', id)
  void nextTick(() => list.value?.$el.querySelector('[data-state=active]')?.scrollIntoView({ inline: 'center', block: 'nearest' }))
})

// One live region tells the operator a change is on its way and that it landed.
// A failure still arrives as a toast.
const saving = computed(() => server.pendingActions.value > 0)
const status = ref<'idle' | 'saving' | 'saved'>('idle')
let settled: ReturnType<typeof setTimeout> | undefined
watch(saving, (now, before) => {
  clearTimeout(settled)
  if (now) {
    status.value = 'saving'
  } else if (before && status.value === 'saving') {
    status.value = 'saved'
    settled = setTimeout(() => (status.value = 'idle'), 2000)
  }
})
</script>

<template>
  <!-- One body, two shells: a dialog where there is room, a full-height sheet on a phone. -->
  <component
    :is="wide ? Dialog : Sheet"
    v-model:open="open"
  >
    <component
      :is="wide ? DialogContent : SheetContent"
      v-bind="wide ? {} : { side: 'bottom' }"
      :class="wide ? 'flex h-[min(88dvh,46rem)] flex-col gap-4 sm:max-w-3xl' : 'flex h-dvh max-h-dvh flex-col gap-0 rounded-none p-0'"
    >
      <component :is="wide ? DialogHeader : SheetHeader" :class="wide ? 'text-left' : 'border-b px-4 py-3 text-left'">
        <component :is="wide ? DialogTitle : SheetTitle">{{ t('settings.title') }}</component>
        <component :is="wide ? DialogDescription : SheetDescription" :class="wide ? '' : 'sr-only'">
          {{ t('settings.description') }}
        </component>
        <p role="status" class="text-muted-foreground h-4 text-xs">
          <template v-if="status === 'saving'">{{ t('settings.saving') }}</template>
          <template v-else-if="status === 'saved'">{{ t('settings.saved') }}</template>
        </p>
      </component>

      <p v-if="!server.canOperate.value" class="bg-muted text-foreground mx-0 rounded-md px-3 py-2 text-sm" :class="wide ? '' : 'mx-4'">{{ t('settings.readonly') }}</p>

      <Tabs
        v-model="tab"
        :orientation="wide ? 'vertical' : 'horizontal'"
        class="flex min-h-0 flex-1 gap-0"
        :class="wide ? 'flex-row gap-6' : 'flex-col px-4 pt-3'"
      >
        <div :class="wide ? 'shrink-0' : '-mx-1 overflow-x-auto px-1'">
          <TabsList ref="list" :class="wide ? 'h-auto w-40 flex-col items-stretch' : 'w-max'">
            <TabsTrigger v-for="[id, label] in TABS" :key="id" :value="id" class="min-h-9 px-4" :class="wide ? 'justify-start' : ''">{{ t(label) }}</TabsTrigger>
          </TabsList>
        </div>
        <div class="min-h-0 min-w-0 flex-1 overflow-y-auto py-1 pr-2 pb-[max(1rem,env(safe-area-inset-bottom))]" :class="wide ? '' : 'py-4 pr-1'">
          <TabsContent value="session" class="mt-0"><SessionSettings /></TabsContent>
          <TabsContent value="display" class="mt-0"><DisplaySettings /></TabsContent>
          <TabsContent value="interface" class="mt-0"><InterfaceSettings /></TabsContent>
          <TabsContent value="server" class="mt-0"><ServerSettings @leave="open = false" /></TabsContent>
        </div>
      </Tabs>
    </component>
  </component>
</template>
