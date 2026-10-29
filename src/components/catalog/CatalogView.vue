<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { server } from '@/app/server'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { t, type MessageKey } from '@/i18n'
import CatalogAgents from './CatalogAgents.vue'
import CatalogMcp from './CatalogMcp.vue'
import CatalogModels from './CatalogModels.vue'
import CatalogPlugins from './CatalogPlugins.vue'
import CatalogSessions from './CatalogSessions.vue'
import CatalogSkills from './CatalogSkills.vue'
import CatalogTasks from './CatalogTasks.vue'

const open = defineModel<boolean>('open', { required: true })
const wide = useMediaQuery('(min-width: 768px)')

// A tab appears only when the server lists its route in GET /info.
const TABS = [
  { id: 'sessions', route: 'GET /sessions', label: 'catalog.tab.sessions', view: CatalogSessions },
  { id: 'models', route: 'GET /models', label: 'catalog.tab.models', view: CatalogModels },
  { id: 'agents', route: 'GET /agents', label: 'catalog.tab.agents', view: CatalogAgents },
  { id: 'skills', route: 'GET /skills', label: 'catalog.tab.skills', view: CatalogSkills },
  { id: 'mcp', route: 'GET /mcp', label: 'catalog.tab.mcp', view: CatalogMcp },
  { id: 'plugins', route: 'GET /plugins', label: 'catalog.tab.plugins', view: CatalogPlugins },
  { id: 'tasks', route: 'GET /tasks', label: 'catalog.tab.tasks', view: CatalogTasks },
] as const

const tabs = computed(() => TABS.filter((tab) => server.can(tab.route)))
const tab = ref<string>('sessions')
</script>

<template>
  <component :is="wide ? Dialog : Sheet" v-model:open="open">
    <component
      :is="wide ? DialogContent : SheetContent"
      v-bind="wide ? {} : { side: 'bottom' }"
      :class="wide ? 'flex h-[min(88dvh,44rem)] flex-col gap-4 sm:max-w-3xl' : 'flex h-dvh max-h-dvh flex-col gap-0 rounded-none p-0'"
    >
      <component :is="wide ? DialogHeader : SheetHeader" :class="wide ? 'text-left' : 'border-b px-4 py-3 text-left'">
        <component :is="wide ? DialogTitle : SheetTitle">{{ t('catalog.title') }}</component>
        <component :is="wide ? DialogDescription : SheetDescription" :class="wide ? '' : 'sr-only'">
          {{ t('catalog.description') }}
        </component>
      </component>

      <Tabs v-model="tab" class="flex min-h-0 flex-1 flex-col gap-0" :class="wide ? '' : 'px-4 pt-3'">
        <div class="-mx-1 overflow-x-auto px-1">
          <TabsList class="w-max">
            <TabsTrigger v-for="entry in tabs" :key="entry.id" :value="entry.id" class="min-h-9 px-4">
              {{ t(entry.label as MessageKey) }}
            </TabsTrigger>
          </TabsList>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto py-4 pr-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <TabsContent v-for="entry in tabs" :key="entry.id" :value="entry.id" class="mt-0">
            <component :is="entry.view" @leave="open = false" />
          </TabsContent>
        </div>
      </Tabs>
    </component>
  </component>
</template>
