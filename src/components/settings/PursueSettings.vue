<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { server } from '@/app/server'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { t, type MessageKey } from '@/i18n'
import type { PursueConfiguration, PursueLimitName, PursueModelConfiguration } from '@/protocol/types'
import { formatWindow } from '@/session/usage-text'
import PursueLimitSetting from './PursueLimitSetting.vue'
import SideModelSettings from './SideModelSettings.vue'
import SettingRow from './SettingRow.vue'

const model = server.model
const configuration = ref<PursueConfiguration>()
const loading = ref(false)
const saving = ref(false)
const failed = ref(false)
let readRequest: AbortController | undefined
let writeRequest: AbortController | undefined
const supported = computed(() => server.can('GET /pursue/configuration'))
const canEditLimits = computed(() => server.can('PUT /pursue/limits/{name}'))
const canEditModels = computed(() => server.can('GET /options') && server.can('PUT /options/{id}'))
const busy = computed(() => model.turnActive || model.activity === 'compacting')
const locked = computed(() => !server.isAdmin.value || server.phase.value !== 'live' || busy.value || saving.value || loading.value)
const LIMITS = [
  { name: 'continuations', field: 'continuations', minimum: 0, label: 'settings.pursue.continuations', help: 'settings.pursue.continuations.help' },
  { name: 'stalls', field: 'stalls', minimum: 1, label: 'settings.pursue.stalls', help: 'settings.pursue.stalls.help' },
  { name: 'model-calls', field: 'modelCalls', minimum: 1, label: 'settings.pursue.modelCalls', help: 'settings.pursue.modelCalls.help' },
  { name: 'tool-calls', field: 'toolCalls', minimum: 0, label: 'settings.pursue.toolCalls', help: 'settings.pursue.toolCalls.help' },
  { name: 'duration', field: 'durationSeconds', minimum: 1, label: 'settings.pursue.duration', help: 'settings.pursue.duration.help' },
  { name: 'wait', field: 'waitSeconds', minimum: 1, label: 'settings.pursue.wait', help: 'settings.pursue.wait.help' },
] as const satisfies readonly { name: PursueLimitName; field: keyof PursueConfiguration['limits']; minimum: number; label: MessageKey; help: MessageKey }[]

async function refresh(): Promise<void> {
  if (!supported.value || server.phase.value !== 'live' || saving.value) return
  readRequest?.abort()
  const controller = new AbortController()
  readRequest = controller
  loading.value = true
  failed.value = false
  const result = await server.loadPursueConfiguration(controller.signal)
  if (controller.signal.aborted) return
  if (result) configuration.value = result
  else failed.value = true
  loading.value = false
}

async function save(name: PursueLimitName, value: number | null): Promise<boolean> {
  if (locked.value || !canEditLimits.value) return false
  const controller = new AbortController()
  writeRequest = controller
  saving.value = true
  const result = await server.setPursueLimit(name, value, controller.signal)
  if (controller.signal.aborted) return false
  if (result) configuration.value = result
  saving.value = false
  return result !== undefined
}

const hasOption = (id: string) => model.options.some((option) => option.id === id)
function modelText(value: PursueModelConfiguration, inherited: boolean, compaction = false): string {
  if (inherited) return t(compaction ? 'settings.pursue.compaction.inherit' : 'settings.off.session')
  return [value.provider, value.model].filter(Boolean).join(' / ')
}
function tuningText(value: PursueModelConfiguration): string {
  return [value.thinking, value.tier, value.speed, value.context === null ? '' : formatWindow(value.context)].filter(Boolean).join(' · ')
}

watch(
  [() => model.sessionId, () => model.snapshotRevision, () => server.phase.value, supported],
  () => {
    readRequest?.abort()
    writeRequest?.abort()
    configuration.value = undefined
    loading.value = false
    saving.value = false
    failed.value = false
    void refresh()
  },
  { immediate: true },
)
// Model changes have options.changed; limit edits have no event and need Refresh.
watch(
  () => model.options.filter((option) => option.id.startsWith('pursue_')).map((option) => `${option.id}:${option.current}`).join('\n'),
  () => void refresh(),
)
onBeforeUnmount(() => {
  readRequest?.abort()
  writeRequest?.abort()
})
</script>

<template>
  <section v-if="supported" class="py-4" aria-labelledby="pursue-settings-heading">
    <div class="flex items-center justify-between gap-3">
      <h3 id="pursue-settings-heading" class="text-sm font-medium">{{ t('panel.pursue') }}</h3>
      <Button variant="outline" size="sm" :disabled="loading || saving || server.phase.value !== 'live'" @click="refresh">{{ t('catalog.refresh') }}</Button>
    </div>
    <p class="text-muted-foreground mt-1 text-xs">{{ t('settings.pursue.help') }}</p>
    <p v-if="!server.isAdmin.value" class="text-muted-foreground mt-1 text-xs">{{ t('settings.adminOnly') }}</p>
    <p v-else-if="busy" class="text-muted-foreground mt-1 text-xs">{{ t('settings.reviewer.busy') }}</p>
    <p v-if="loading" role="status" class="text-muted-foreground mt-3 flex items-center gap-2 text-sm"><Spinner class="motion-reduce:animate-none" />{{ t('catalog.loading') }}</p>
    <p v-if="failed" role="alert" class="text-destructive mt-3 text-sm">{{ t('settings.pursue.loadFailed') }}</p>
    <template v-if="configuration">
      <SideModelSettings v-if="canEditModels && hasOption('pursue_model')" slot="pursue" :disabled="locked" />
      <SettingRow v-else :label="t('settings.pursue.model')" :help="t('settings.pursue.model.help')">
        <p class="break-words text-sm">{{ modelText(configuration.model, configuration.model.usesSessionModel) }}</p>
        <p class="text-muted-foreground break-words text-xs">{{ tuningText(configuration.model) }}</p>
      </SettingRow>
      <SideModelSettings v-if="canEditModels && hasOption('pursue_compaction_model')" slot="pursue_compaction" :disabled="locked" />
      <SettingRow v-else :label="t('settings.pursue.compaction')" :help="t('settings.pursue.compaction.help')">
        <p class="break-words text-sm">{{ modelText(configuration.compaction, configuration.compaction.usesSessionSetting, true) }}</p>
        <p class="text-muted-foreground break-words text-xs">{{ tuningText(configuration.compaction) }}</p>
      </SettingRow>
      <h4 class="mt-4 text-sm font-medium">{{ t('settings.pursue.limits') }}</h4>
      <p class="text-muted-foreground mt-1 text-xs">{{ t('settings.pursue.limits.help') }}</p>
      <div class="divide-y">
        <PursueLimitSetting v-for="limit in LIMITS" :key="limit.name" :name="limit.name" :label="t(limit.label)" :help="t(limit.help)" :value="configuration.limits[limit.field]" :minimum="limit.minimum" :disabled="locked || !canEditLimits" :save="save" />
      </div>
    </template>
  </section>
</template>
