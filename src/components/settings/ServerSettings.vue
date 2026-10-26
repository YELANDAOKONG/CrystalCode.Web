<script setup lang="ts">
import { LogOut } from '@lucide/vue'
import { server } from '@/app/server'
import { Button } from '@/components/ui/button'
import AdminPanel from '@/components/session/AdminPanel.vue'
import { t } from '@/i18n'
import ReportRows from '@/components/report/ReportRows.vue'

const emit = defineEmits<{ leave: [] }>()

const build = () => {
  const b = server.info.value?.build
  return b ? [b.crystalCode, b.runtime, b.os].filter(Boolean).join(' · ') : ''
}

const rows = () => [
  { label: t('settings.server.connected'), value: server.target.value?.url ?? '', mono: true },
  { label: t('settings.server.workspace'), value: server.model.chrome?.workspace ?? '', mono: true },
  { label: t('settings.server.build'), value: build() },
]

function disconnect(): void {
  emit('leave')
  server.disconnect()
}
</script>

<template>
  <div class="space-y-6">
    <ReportRows :rows="rows().filter((row) => row.value !== '')" />
    <Button variant="outline" class="h-10 sm:h-9" @click="disconnect">
      <LogOut class="size-4" />
      {{ t('settings.server.disconnect') }}
    </Button>
    <AdminPanel />
  </div>
</template>
