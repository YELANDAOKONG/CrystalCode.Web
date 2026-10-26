<script setup lang="ts">
import { computed } from 'vue'
import { LogOut } from '@lucide/vue'
import { server } from '@/app/server'
import AdminPanel from '@/components/session/AdminPanel.vue'
import { Button } from '@/components/ui/button'
import { t, type MessageKey } from '@/i18n'
import { buildSections } from '@/session/build'

const emit = defineEmits<{ leave: [] }>()

const sections = computed(() => {
  const build = server.info.value?.build
  return build ? buildSections(build) : { build: [], host: [] }
})

function disconnect(): void {
  emit('leave')
  server.disconnect()
}
</script>

<template>
  <div class="space-y-6">
    <section aria-labelledby="conn-heading" class="space-y-2">
      <h3 id="conn-heading" class="text-sm font-medium">{{ t('settings.server.section.connection') }}</h3>
      <dl class="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt class="text-muted-foreground">{{ t('settings.server.connected') }}</dt>
        <dd class="min-w-0 font-mono text-xs leading-5 break-all">{{ server.target.value?.url }}</dd>
        <template v-if="server.model.chrome?.workspace">
          <dt class="text-muted-foreground">{{ t('settings.server.workspace') }}</dt>
          <dd class="min-w-0 font-mono text-xs leading-5 break-all">{{ server.model.chrome.workspace }}</dd>
        </template>
      </dl>
    </section>

    <section v-if="sections.build.length" aria-labelledby="build-heading" class="space-y-2">
      <h3 id="build-heading" class="text-sm font-medium">{{ t('settings.server.section.build') }}</h3>
      <dl class="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-1.5 text-sm">
        <template v-for="row in sections.build" :key="row.key">
          <dt class="text-muted-foreground">{{ t(`settings.server.build.${row.key}` as MessageKey) }}</dt>
          <dd class="min-w-0" :class="row.mono ? 'font-mono text-xs leading-5 break-all' : 'break-words'">{{ row.value }}</dd>
        </template>
      </dl>
    </section>

    <section v-if="sections.host.length" aria-labelledby="host-heading" class="space-y-2">
      <h3 id="host-heading" class="text-sm font-medium">{{ t('settings.server.section.host') }}</h3>
      <dl class="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-1.5 text-sm">
        <template v-for="row in sections.host" :key="row.key">
          <dt class="text-muted-foreground">{{ t(`settings.server.build.${row.key}` as MessageKey) }}</dt>
          <dd class="min-w-0 break-words">{{ row.value }}</dd>
        </template>
      </dl>
    </section>

    <Button variant="outline" class="h-10 sm:h-9" @click="disconnect">
      <LogOut class="size-4" />
      {{ t('settings.server.disconnect') }}
    </Button>
    <AdminPanel />
  </div>
</template>
