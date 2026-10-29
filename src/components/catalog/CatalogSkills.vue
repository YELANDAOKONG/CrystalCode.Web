<script setup lang="ts">
import { RotateCw } from '@lucide/vue'
import { server } from '@/app/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { useBusy } from '@/composables/busy'
import { useQuery } from '@/composables/query'
import { t } from '@/i18n'
import CatalogPane from './CatalogPane.vue'

const { isAdmin } = server
const { data, loading, failed, reload } = useQuery(() => server.loadSkills())

// Both write saved configuration or rescan disk, so the server asks for admin.
const { busy, anyBusy, run: track } = useBusy()
const run = (key: string, command: string) =>
  track(key, async () => {
    await server.send(command)
    await reload()
  })
</script>

<template>
  <CatalogPane :loading="loading" :failed="failed" :empty="!data" :empty-text="t('catalog.skills.empty')" @refresh="reload">
    <template #actions>
      <label v-if="data" class="flex min-h-10 items-center gap-2 text-sm">
        <Spinner v-if="busy('switch')" class="text-muted-foreground size-4 motion-reduce:animate-none" />
        <Switch :model-value="data.enabled" :disabled="!isAdmin || anyBusy()" :aria-busy="busy('switch') || undefined" @update:model-value="(on) => run('switch', on === true ? '/skills on' : '/skills off')" />
        {{ t('catalog.skills.enabled') }}
      </label>
      <Button v-if="data" variant="outline" size="sm" class="h-10 md:h-8" :disabled="!isAdmin || !data.enabled || anyBusy()" :aria-busy="busy('reload') || undefined" @click="run('reload', '/skills reload')">
        <Spinner v-if="busy('reload')" class="size-3.5 motion-reduce:animate-none" />
        <RotateCw v-else class="size-3.5" />
        {{ t('catalog.skills.reload') }}
      </Button>
    </template>
    <template #summary>
      <p v-if="!isAdmin" class="text-muted-foreground text-xs">{{ t('settings.adminOnly') }}</p>
    </template>
    <template v-if="data">
      <p v-if="!data.enabled" class="text-muted-foreground text-sm">{{ t('catalog.skills.disabled') }}</p>
      <p v-else-if="data.skills.length === 0" class="text-muted-foreground py-4 text-center text-sm">{{ t('catalog.skills.none') }}</p>
      <ul v-else class="divide-y">
        <li v-for="skill in data.skills" :key="skill.location" class="space-y-1 py-3">
          <p class="flex items-center gap-2 text-sm font-medium">
            <span class="break-all">{{ skill.name }}</span>
            <Badge variant="secondary">{{ skill.source === 'project' ? t('catalog.skills.project') : t('catalog.skills.home') }}</Badge>
          </p>
          <p class="text-muted-foreground text-sm break-words">{{ skill.description }}</p>
          <p class="text-muted-foreground font-mono text-xs break-all">{{ skill.location }}</p>
        </li>
      </ul>
    </template>
  </CatalogPane>
</template>
