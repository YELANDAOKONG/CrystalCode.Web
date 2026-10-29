<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { useBusy } from '@/composables/busy'
import ChoiceSelect from '@/components/settings/ChoiceSelect.vue'
import SettingRow from '@/components/settings/SettingRow.vue'
import { t } from '@/i18n'
import type { AgentEntry } from '@/protocol/types'
import { findArguments, toOptions, type Option } from '@/session/settings'
import { formatWindow } from '@/session/usage-text'

// One Agent's model and its model-specific settings. The choices come from the
// server's command list (`/agents model <name>` and the like), so an Agent
// whose model has no tiers offers none. `inherit` clears a setting.
const props = defineProps<{ agent: AgentEntry }>()
const emit = defineEmits<{ changed: [] }>()

const model = server.model
const { isAdmin } = server

const INHERIT = 'inherit'
const inherit: Option = { value: INHERIT, label: t('catalog.agents.inherit'), help: '' }

const choices = (verb: string) => findArguments(model.commands, 'agents', verb, props.agent.name)

const models = computed<Option[]>(() => [
  inherit,
  ...choices('model').flatMap((provider) =>
    provider.arguments.map((entry) => ({ value: `${provider.name} ${entry.name}`, label: entry.name, help: '', group: provider.name })),
  ),
])
const slot = (verb: string): Option[] => [inherit, ...toOptions(choices(verb))]
const thinking = computed(() => slot('thinking'))
const tiers = computed(() => slot('tier'))
const speeds = computed(() => slot('speed'))
const contexts = computed<Option[]>(() => [
  inherit,
  ...choices('context').map((entry) => ({ value: entry.name, label: formatWindow(Number(entry.name)) || entry.name, help: '' })),
])

const m = computed(() => props.agent.model)
const currentModel = computed(() => (m.value.provider && m.value.model ? `${m.value.provider} ${m.value.model}` : INHERIT))
const hasModel = computed(() => currentModel.value !== INHERIT)

// The engine refuses an Agent change during a turn or compaction.
const locked = computed(() => !isAdmin.value || model.turnActive || anyBusy())
const note = computed(() => (model.turnActive ? t('settings.reviewer.busy') : !isAdmin.value ? t('settings.adminOnly') : undefined))

const { busy, anyBusy, run } = useBusy()
async function apply(verb: string, value: string): Promise<void> {
  const name = props.agent.name
  const argument = value === INHERIT ? '' : ` ${value}`
  const result = await run(verb, () => server.send(`/agents ${verb} ${name}${argument}`))
  if (result?.accepted) emit('changed')
}

const id = (verb: string) => `agent-${props.agent.name}-${verb}`
</script>

<template>
  <div class="border-l-2 pl-3">
    <p v-if="note" class="text-muted-foreground py-2 text-xs">{{ note }}</p>
    <SettingRow :label="t('catalog.agents.field.model')" :label-for="id('model')">
      <ChoiceSelect :id="id('model')" :options="models" :model-value="currentModel" :disabled="locked" :loading="busy('model')" @change="(v) => apply('model', v)" />
    </SettingRow>
    <template v-if="hasModel">
      <SettingRow v-if="thinking.length > 1" :label="t('settings.thinking')" :label-for="id('thinking')">
        <ChoiceSelect :id="id('thinking')" :options="thinking" :model-value="m.thinking ?? INHERIT" :disabled="locked" :loading="busy('thinking')" @change="(v) => apply('thinking', v)" />
      </SettingRow>
      <SettingRow v-if="contexts.length > 2" :label="t('settings.context')" :label-for="id('context')">
        <ChoiceSelect :id="id('context')" :options="contexts" :model-value="m.context === null ? INHERIT : String(m.context)" :disabled="locked" :loading="busy('context')" @change="(v) => apply('context', v)" />
      </SettingRow>
      <SettingRow v-if="tiers.length > 1" :label="t('settings.tier')" :label-for="id('tier')">
        <ChoiceSelect :id="id('tier')" :options="tiers" :model-value="m.tier ?? INHERIT" :disabled="locked" :loading="busy('tier')" @change="(v) => apply('tier', v)" />
      </SettingRow>
      <SettingRow v-if="speeds.length > 1" :label="t('settings.speed')" :label-for="id('speed')">
        <ChoiceSelect :id="id('speed')" :options="speeds" :model-value="m.speed ?? INHERIT" :disabled="locked" :loading="busy('speed')" @change="(v) => apply('speed', v)" />
      </SettingRow>
    </template>
  </div>
</template>
