<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { server } from '@/app/server'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { useBusy } from '@/composables/busy'
import { t, type MessageKey } from '@/i18n'
import { displayToken } from '@/session/display-case'
import { modeLabel } from '@/session/mode'
import {
  approvalModes,
  currentByLabel,
  currentWindowOption,
  findArguments,
  modeChoices,
  toOptions,
  type Option,
} from '@/session/settings'
import { formatWindow } from '@/session/usage-text'
import SessionChoice from './SessionChoice.vue'
import SettingsGroup from './SettingsGroup.vue'
import SideModelSettings from './SideModelSettings.vue'
import SettingRow from './SettingRow.vue'
import PursueSettings from './PursueSettings.vue'

const model = server.model
const { canOperate, isAdmin } = server

const chrome = computed(() => model.chrome)
const commands = computed(() => model.commands)

const locked = computed(() => !canOperate.value)

// /approval and the model settings change saved configuration and session
// trust, so the server asks for admin. Mode is an ordinary operate command.
const adminLocked = computed(() => !isAdmin.value)

const modes = computed(() => modeChoices(commands.value))
const approvals = computed(() => approvalModes(commands.value))
const thinking = computed(() => toOptions(findArguments(commands.value, 'thinking')))
// The server lists `unset` first for a model that has tiers or speeds, and
// accepts it to clear the slot. The page words it the way side models do.
const slotOptions = (name: string): Option[] =>
  toOptions(findArguments(commands.value, name)).map((option) =>
    option.value === 'unset' ? { ...option, label: t('settings.option.none') } : option,
  )
const tiers = computed(() => slotOptions('tier'))
const speeds = computed(() => slotOptions('speed'))
const windowOptions = computed(() => findArguments(commands.value, 'context'))
const windows = computed<Option[]>(() =>
  windowOptions.value.map((option) => ({ value: option.name, label: option.name.toUpperCase(), help: option.help })),
)

// /model takes `provider model`. The server lists each provider with its models.
const providerModels = computed(() => findArguments(commands.value, 'model').filter((entry) => entry.arguments.length > 0))
const modelOptions = computed<Option[]>(() =>
  providerModels.value.flatMap((provider) =>
    provider.arguments.map((entry) => ({
      value: `${provider.name} ${entry.name}`,
      label: entry.name,
      help: '',
      group: provider.name,
    })),
  ),
)

const currentMode = computed(() => chrome.value?.mode)
const currentApproval = computed(() => chrome.value?.approval.toLowerCase())
// The same model name can exist under several providers, so match both.
const currentModel = computed(() => {
  const current = chrome.value
  return current ? modelOptions.value.find((option) => option.value === `${current.provider} ${current.model}`)?.value : undefined
})
const currentThinking = computed(() => currentByLabel(thinking.value, chrome.value?.thinking.replace(/^Think\s+/i, '') ?? ''))
// The status bar shows a blank label for an unset slot.
const currentSlot = (options: Option[], shown: string | undefined, prefix: RegExp): string | undefined =>
  shown === undefined ? undefined : shown === '' ? 'unset' : currentByLabel(options, shown.replace(prefix, ''))
const currentTier = computed(() => currentSlot(tiers.value, chrome.value?.serviceTier, /^Tier\s+/i))
const currentSpeed = computed(() => currentSlot(speeds.value, chrome.value?.speed, /^Speed\s+/i))
const currentWindow = computed(() => currentWindowOption(windowOptions.value, chrome.value))

// The engine reports the outcome as a note or an error in the conversation, and
// the new value arrives as a chrome event. The page shows the server's answer,
// never its own guess.
// `GET /options` lists what a front end may offer as a switch or a picker, each
// value tied to its slash command. The page draws the prompt set and the
// feature switches from it. Estimated tokens has its own row on the Display tab.
const canOptions = computed(() => server.can('GET /options') && server.can('PUT /options/{id}'))
onMounted(() => {
  if (server.can('GET /options')) void server.loadOptions()
})
const promptSet = computed(() => model.options.find((option) => option.id === 'prompt_set'))
const promptSets = computed<Option[]>(() =>
  (promptSet.value?.values ?? []).map((value) => ({ value: value.value, label: value.name, help: value.description ?? '' })),
)
// Model switches are shown beside their corresponding picker.
const GROUPED = new Set(['estimated_tokens', 'topic', 'approval_model_enabled', 'extended_approval', 'compaction_model_enabled', 'image_model_enabled', 'audio_model_enabled', 'video_model_enabled', 'document_model_enabled'])
const switches = computed(() => model.options.filter((option) => option.switch && !GROUPED.has(option.id)))
const setPromptSet = (value: string) => void track('prompt_set', () => server.setOption('prompt_set', value))
const setSwitch = (id: string, on: boolean | 'indeterminate') => void track(id, () => server.setOption(id, on === true))

// Each control keeps its own in-flight flag, so a slow answer shows a spinner
// on the control that was changed and nowhere else.
const { busy, run: track } = useBusy()
const run = (key: string, command: string) => void track(key, () => server.send(command))
const setMode = (name: string) => void track('mode', () => server.setMode('set', name))

// While a turn or compaction runs, the server records a change and applies it
// on the next turn. The chrome lists what waits; the control keeps showing the
// active value until then.
const pending = computed(() => chrome.value?.pending ?? {})
const waiting = (value: string | undefined): string | undefined =>
  value === undefined ? undefined : t('settings.pending', { value })
const slotLabel = (value: string | undefined): string | undefined =>
  value === undefined ? undefined : value === 'unset' ? t('settings.option.none') : displayToken(value)

const pendingMode = computed(() => waiting(pending.value.mode === undefined ? undefined : modeLabel(pending.value.mode)))
const pendingApproval = computed(() => waiting(slotLabel(pending.value.approval)))
const pendingModel = computed(() =>
  waiting(pending.value.provider === undefined ? undefined : `${pending.value.provider} / ${pending.value.model}`),
)
const pendingThinking = computed(() => waiting(slotLabel(pending.value.thinking)))
const pendingContext = computed(() =>
  waiting(pending.value.contextWindow === undefined ? undefined : formatWindow(pending.value.contextWindow)),
)
const pendingTier = computed(() => waiting(slotLabel(pending.value.serviceTier)))
const pendingSpeed = computed(() => waiting(slotLabel(pending.value.speed)))

// The server names its switches in English. Known ones get a translated name.
const SWITCH_LABELS: Record<string, MessageKey> = {
  agents: 'settings.opt.agents',
  micro_compaction: 'settings.opt.micro_compaction',
  topic: 'settings.opt.topic',
}
const switchLabel = (id: string, name: string) => (SWITCH_LABELS[id] ? t(SWITCH_LABELS[id]) : name)
const switchHelp = (id: string, description: string | null) => {
  const key = `settings.opt.${id}.help` as MessageKey
  return SWITCH_LABELS[id] ? t(key) : (description ?? undefined)
}
const thinkingNote = computed(() => (chrome.value && chrome.value.thinking === '' ? t('settings.thinking.unsupported') : undefined))
</script>

<template>
  <div class="space-y-8">
    <SettingsGroup :title="t('settings.group.session')" scope="server">
      <SessionChoice
        id="set-mode"
        :label="t('settings.mode')"
        :help="t('settings.mode.help')"
        :options="modes"
        :current="currentMode"
        :pending="pendingMode"
        :loading="busy('mode')"
        @change="setMode"
      />
      <SessionChoice
        id="set-approval"
        admin
        :label="t('settings.approval')"
        :help="t('settings.approval.help')"
        :options="approvals"
        :current="currentApproval"
        :pending="pendingApproval"
        :loading="busy('approval')"
        @change="(v) => run('approval', `/approval ${v}`)"
      />
      <SessionChoice
        id="set-model"
        admin
        :label="t('settings.model')"
        :help="t('settings.model.help')"
        :options="modelOptions"
        :current="currentModel"
        :pending="pendingModel"
        :loading="busy('model')"
        @change="(v) => run('model', `/model ${v}`)"
      />
      <SessionChoice
        id="set-thinking"
        admin
        :label="t('settings.thinking')"
        :help="t('settings.thinking.help')"
        :options="thinking"
        :current="currentThinking"
        :pending="pendingThinking"
        :note="thinkingNote"
        :loading="busy('thinking')"
        @change="(v) => run('thinking', `/thinking ${v}`)"
      />
      <SessionChoice
        v-if="windows.length > 0"
        id="set-context"
        admin
        :label="t('settings.context')"
        :help="t('settings.context.help')"
        :options="windows"
        :current="currentWindow"
        :pending="pendingContext"
        :note="windows.length === 1 ? t('settings.single') : undefined"
        :disabled="windows.length < 2"
        :loading="busy('context')"
        @change="(v) => run('context', `/context ${v}`)"
      />
      <SessionChoice
        v-if="tiers.length > 0"
        id="set-tier"
        admin
        :label="t('settings.tier')"
        :options="tiers"
        :current="currentTier"
        :pending="pendingTier"
        :loading="busy('tier')"
        @change="(v) => run('tier', `/tier ${v}`)"
      />
      <SessionChoice
        v-if="speeds.length > 0"
        id="set-speed"
        admin
        :label="t('settings.speed')"
        :options="speeds"
        :current="currentSpeed"
        :pending="pendingSpeed"
        :loading="busy('speed')"
        @change="(v) => run('speed', `/speed ${v}`)"
      />
      <SessionChoice
        v-if="canOptions && promptSets.length > 1"
        id="set-promptset"
        admin
        :label="t('settings.promptSet')"
        :help="t('settings.promptSet.help')"
        :options="promptSets"
        :current="promptSet?.current"
        :loading="busy('prompt_set')"
        @change="setPromptSet"
      />
      <template v-if="canOptions">
        <SettingRow
          v-for="option in switches"
          :key="option.id"
          :label="switchLabel(option.id, option.name)"
          :help="switchHelp(option.id, option.description)"
          :label-for="`opt-${option.id}`"
        >
          <div class="flex items-center gap-2 sm:justify-end">
            <Spinner v-if="busy(option.id)" class="text-muted-foreground size-4 motion-reduce:animate-none" />
            <Switch
              :id="`opt-${option.id}`"
              :model-value="option.current === 'on'"
              :aria-busy="busy(option.id) || undefined"
              :disabled="locked || adminLocked || busy(option.id)"
              @update:model-value="(on) => setSwitch(option.id, on)"
            />
          </div>
        </SettingRow>
      </template>
    </SettingsGroup>

    <SettingsGroup v-if="canOptions" :title="t('settings.group.side')" scope="server">
      <SideModelSettings slot="approval" />
      <SideModelSettings slot="extended" />
      <SideModelSettings slot="compaction" />
      <SideModelSettings slot="topic" />
      <SideModelSettings slot="image" />
      <SideModelSettings slot="audio" />
      <SideModelSettings slot="video" />
      <SideModelSettings slot="document" />
    </SettingsGroup>

    <PursueSettings />
  </div>
</template>
