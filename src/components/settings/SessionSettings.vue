<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { Separator } from '@/components/ui/separator'
import { t } from '@/i18n'
import { modeLabel } from '@/session/mode'
import {
  approvalModes,
  currentByLabel,
  currentWindowOption,
  findArguments,
  toOptions,
  type Option,
} from '@/session/settings'
import ChoiceSelect from './ChoiceSelect.vue'
import SettingRow from './SettingRow.vue'

const model = server.model
const { canOperate, isAdmin } = server

const chrome = computed(() => model.chrome)
const commands = computed(() => model.commands)

// Changing the model, thinking, or context window rebuilds the model client,
// which the engine refuses while a turn runs.
const turnBusy = computed(() => model.turnActive)
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
      label: `${provider.name} / ${entry.name}`,
      help: '',
    })),
  ),
)

const currentMode = computed(() => chrome.value?.mode)
const currentApproval = computed(() => chrome.value?.approval.toLowerCase())
const currentModel = computed(() => modelOptions.value.find((option) => option.value.endsWith(` ${chrome.value?.model ?? ''}`))?.value)
const currentThinking = computed(() => currentByLabel(thinking.value, chrome.value?.thinking.replace(/^Think\s+/i, '') ?? ''))
const currentTier = computed(() => currentByLabel(tiers.value, chrome.value?.serviceTier.replace(/^Tier\s+/i, '') ?? ''))
const currentSpeed = computed(() => currentByLabel(speeds.value, chrome.value?.speed.replace(/^Speed\s+/i, '') ?? ''))
const currentWindow = computed(() => currentWindowOption(windowOptions.value, chrome.value))

// The engine reports the outcome as a note or an error in the conversation, and
// the new value arrives as a chrome event. The page shows the server's answer,
// never its own guess.
const run = (command: string) => void server.send(command)
const setMode = (name: string) => void server.setMode('set', name)
const thinkingNote = computed(() => (chrome.value && chrome.value.thinking === '' ? t('settings.thinking.unsupported') : undefined))
</script>

<template>
  <div class="divide-y">
    <p v-if="locked" class="text-muted-foreground pb-3 text-sm">{{ t('settings.readonly') }}</p>

    <SettingRow :label="t('settings.mode')" :help="t('settings.mode.help')" label-for="set-mode">
      <ChoiceSelect id="set-mode" :options="modes" :model-value="currentMode" :disabled="locked" @change="setMode" />
    </SettingRow>

    <SettingRow
      :label="t('settings.approval')"
      :help="t('settings.approval.help')"
      :note="adminLocked && canOperate ? t('settings.adminOnly') : undefined"
      label-for="set-approval"
    >
      <ChoiceSelect
        id="set-approval"
        :options="approvals"
        :model-value="currentApproval"
        :disabled="locked || adminLocked"
        @change="(v) => run(`/approval ${v}`)"
      />
    </SettingRow>

    <SettingRow
      :label="t('settings.model')"
      :help="t('settings.model.help')"
      :note="turnBusy ? t('settings.busy') : adminLocked && canOperate ? t('settings.adminOnly') : undefined"
      label-for="set-model"
    >
      <ChoiceSelect
        id="set-model"
        :options="modelOptions"
        :model-value="currentModel"
        :disabled="locked || adminLocked || turnBusy"
        @change="(v) => run(`/model ${v}`)"
      />
    </SettingRow>

    <SettingRow
      :label="t('settings.thinking')"
      :help="t('settings.thinking.help')"
      :note="thinkingNote ?? (adminLocked && canOperate ? t('settings.adminOnly') : undefined)"
      label-for="set-thinking"
    >
      <ChoiceSelect
        id="set-thinking"
        :options="thinking"
        :model-value="currentThinking"
        :disabled="locked || adminLocked"
        @change="(v) => run(`/thinking ${v}`)"
      />
    </SettingRow>

    <SettingRow
      v-if="windows.length > 0"
      :label="t('settings.context')"
      :help="t('settings.context.help')"
      :note="turnBusy ? t('settings.busy') : windows.length === 1 ? t('settings.single') : undefined"
      label-for="set-context"
    >
      <ChoiceSelect
        id="set-context"
        :options="windows"
        :model-value="currentWindow"
        :disabled="locked || adminLocked || turnBusy || windows.length < 2"
        @change="(v) => run(`/context ${v}`)"
      />
    </SettingRow>

    <SettingRow v-if="tiers.length > 0" :label="t('settings.tier')" label-for="set-tier">
      <ChoiceSelect
        id="set-tier"
        :options="tiers"
        :model-value="currentTier"
        :disabled="locked || adminLocked"
        @change="(v) => run(`/tier ${v}`)"
      />
    </SettingRow>

    <SettingRow v-if="speeds.length > 0" :label="t('settings.speed')" label-for="set-speed">
      <ChoiceSelect
        id="set-speed"
        :options="speeds"
        :model-value="currentSpeed"
        :disabled="locked || adminLocked"
        @change="(v) => run(`/speed ${v}`)"
      />
    </SettingRow>

    <Separator class="hidden" />
  </div>
</template>
