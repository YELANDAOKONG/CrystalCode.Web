<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { server } from '@/app/server'
import { Separator } from '@/components/ui/separator'
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
  toOptions,
  type Option,
} from '@/session/settings'
import { formatWindow } from '@/session/usage-text'
import ChoiceSelect from './ChoiceSelect.vue'
import SideModelSettings from './SideModelSettings.vue'
import SettingRow from './SettingRow.vue'

const model = server.model
const { canOperate, isAdmin } = server

const chrome = computed(() => model.chrome)
const commands = computed(() => model.commands)

const locked = computed(() => !canOperate.value)

// /approval and the model settings change saved configuration and session
// trust, so the server asks for admin. Mode is an ordinary operate command.
const adminLocked = computed(() => !isAdmin.value)

const modes = computed<Option[]>(() =>
  toOptions(findArguments(commands.value, 'mode')).map((option) => ({ ...option, label: modeLabel(option.value) })),
)
const approvals = computed(() => approvalModes(commands.value))
const thinking = computed(() => toOptions(findArguments(commands.value, 'thinking')))
const tiers = computed(() => toOptions(findArguments(commands.value, 'tier')))
const speeds = computed(() => toOptions(findArguments(commands.value, 'speed')))
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
const currentTier = computed(() => currentByLabel(tiers.value, chrome.value?.serviceTier.replace(/^Tier\s+/i, '') ?? ''))
const currentSpeed = computed(() => currentByLabel(speeds.value, chrome.value?.speed.replace(/^Speed\s+/i, '') ?? ''))
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
// Topic naming is drawn with the topic model, so the group here leaves it out.
const GROUPED = new Set(['estimated_tokens', 'topic'])
const switches = computed(() => model.options.filter((option) => option.switch && !GROUPED.has(option.id)))
const topicSwitch = computed(() => model.options.find((option) => option.id === 'topic' && option.switch))
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
  <div class="divide-y">
    <p v-if="locked" class="text-muted-foreground pb-3 text-sm">{{ t('settings.readonly') }}</p>

    <SettingRow :label="t('settings.mode')" :help="t('settings.mode.help')" :note="pendingMode" label-for="set-mode">
      <ChoiceSelect id="set-mode" :options="modes" :model-value="currentMode" :disabled="locked" :loading="busy('mode')" @change="setMode" />
    </SettingRow>

    <SettingRow
      :label="t('settings.approval')"
      :help="t('settings.approval.help')"
      :note="pendingApproval ?? (adminLocked && canOperate ? t('settings.adminOnly') : undefined)"
      label-for="set-approval"
    >
      <ChoiceSelect
        id="set-approval"
        :options="approvals"
        :model-value="currentApproval"
        :disabled="locked || adminLocked"
        :loading="busy('approval')"
        @change="(v) => run('approval', `/approval ${v}`)"
      />
    </SettingRow>

    <SettingRow
      :label="t('settings.model')"
      :help="t('settings.model.help')"
      :note="pendingModel ?? (adminLocked && canOperate ? t('settings.adminOnly') : undefined)"
      label-for="set-model"
    >
      <ChoiceSelect
        id="set-model"
        :options="modelOptions"
        :model-value="currentModel"
        :disabled="locked || adminLocked"
        :loading="busy('model')"
        @change="(v) => run('model', `/model ${v}`)"
      />
    </SettingRow>

    <SettingRow
      :label="t('settings.thinking')"
      :help="t('settings.thinking.help')"
      :note="pendingThinking ?? thinkingNote ?? (adminLocked && canOperate ? t('settings.adminOnly') : undefined)"
      label-for="set-thinking"
    >
      <ChoiceSelect
        id="set-thinking"
        :options="thinking"
        :model-value="currentThinking"
        :disabled="locked || adminLocked"
        :loading="busy('thinking')"
        @change="(v) => run('thinking', `/thinking ${v}`)"
      />
    </SettingRow>

    <SettingRow
      v-if="windows.length > 0"
      :label="t('settings.context')"
      :help="t('settings.context.help')"
      :note="pendingContext ?? (windows.length === 1 ? t('settings.single') : undefined)"
      label-for="set-context"
    >
      <ChoiceSelect
        id="set-context"
        :options="windows"
        :model-value="currentWindow"
        :disabled="locked || adminLocked || windows.length < 2"
        :loading="busy('context')"
        @change="(v) => run('context', `/context ${v}`)"
      />
    </SettingRow>

    <SettingRow v-if="tiers.length > 0" :label="t('settings.tier')" :note="pendingTier" label-for="set-tier">
      <ChoiceSelect
        id="set-tier"
        :options="tiers"
        :model-value="currentTier"
        :disabled="locked || adminLocked"
        :loading="busy('tier')"
        @change="(v) => run('tier', `/tier ${v}`)"
      />
    </SettingRow>

    <SettingRow v-if="speeds.length > 0" :label="t('settings.speed')" :note="pendingSpeed" label-for="set-speed">
      <ChoiceSelect
        id="set-speed"
        :options="speeds"
        :model-value="currentSpeed"
        :disabled="locked || adminLocked"
        :loading="busy('speed')"
        @change="(v) => run('speed', `/speed ${v}`)"
      />
    </SettingRow>

    <SettingRow v-if="canOptions && promptSets.length > 1" :label="t('settings.promptSet')" :help="t('settings.promptSet.help')" label-for="set-promptset">
      <ChoiceSelect
        id="set-promptset"
        :options="promptSets"
        :model-value="promptSet?.current"
        :disabled="locked || adminLocked"
        :loading="busy('prompt_set')"
        @change="setPromptSet"
      />
    </SettingRow>

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

      <SideModelSettings slot="approval" />
      <SideModelSettings slot="extended" />
      <SideModelSettings slot="compaction" />

      <SettingRow v-if="topicSwitch" :label="t('settings.opt.topic')" :help="t('settings.opt.topic.help')" label-for="opt-topic">
        <div class="flex items-center gap-2 sm:justify-end">
          <Spinner v-if="busy('topic')" class="text-muted-foreground size-4 motion-reduce:animate-none" />
          <Switch
            id="opt-topic"
            :model-value="topicSwitch.current === 'on'"
            :aria-busy="busy('topic') || undefined"
            :disabled="locked || adminLocked || busy('topic')"
            @update:model-value="(on) => setSwitch('topic', on)"
          />
        </div>
      </SettingRow>
      <SideModelSettings slot="topic" :dimmed="topicSwitch?.current === 'off'" />
      <SideModelSettings slot="image" />
      <SideModelSettings slot="audio" />
      <SideModelSettings slot="video" />
    </template>

    <Separator class="hidden" />
  </div>
</template>
