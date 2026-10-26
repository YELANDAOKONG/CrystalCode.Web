<script setup lang="ts">
import { ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
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
const tab = ref('session')

const TABS = [
  ['session', 'settings.tab.session'],
  ['display', 'settings.tab.display'],
  ['interface', 'settings.tab.interface'],
  ['server', 'settings.tab.server'],
] as const
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
      :class="wide ? 'flex h-[min(88dvh,42rem)] flex-col gap-4 sm:max-w-2xl' : 'flex h-dvh max-h-dvh flex-col gap-0 rounded-none p-0'"
    >
      <component :is="wide ? DialogHeader : SheetHeader" :class="wide ? 'text-left' : 'border-b px-4 py-3 text-left'">
        <component :is="wide ? DialogTitle : SheetTitle">{{ t('settings.title') }}</component>
        <component :is="wide ? DialogDescription : SheetDescription" :class="wide ? '' : 'sr-only'">
          {{ t('settings.description') }}
        </component>
      </component>

      <Tabs v-model="tab" class="flex min-h-0 flex-1 flex-col gap-0" :class="wide ? '' : 'px-4 pt-3'">
        <div class="-mx-1 overflow-x-auto px-1">
          <TabsList class="w-max">
            <TabsTrigger v-for="[id, label] in TABS" :key="id" :value="id" class="min-h-9 px-4">{{ t(label) }}</TabsTrigger>
          </TabsList>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto py-4 pr-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <TabsContent value="session" class="mt-0"><SessionSettings /></TabsContent>
          <TabsContent value="display" class="mt-0"><DisplaySettings /></TabsContent>
          <TabsContent value="interface" class="mt-0"><InterfaceSettings /></TabsContent>
          <TabsContent value="server" class="mt-0"><ServerSettings @leave="open = false" /></TabsContent>
        </div>
      </Tabs>
    </component>
  </component>
</template>
