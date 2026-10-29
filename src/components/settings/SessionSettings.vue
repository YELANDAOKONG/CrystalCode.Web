<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { Separator } from '@/components/ui/separator'
import { t } from '@/i18n'
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
      label: `${provider.name} / ${entry.name}`,
      help: '',
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
const run = (command: string) => void server.send(command)
const setMode = (name: string) => void server.setMode('set', name)

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

// Reviewers are shown as the server reports them. Changing one is a
// `/approval model` command the page does not offer.
const reviewerText = (reviewer: { provider: string; model: string; thinking: string; serviceTier: string; speed: string }) =>
  [`${reviewer.provider} / ${reviewer.model}`, reviewer.thinking, reviewer.serviceTier, reviewer.speed]
    .filter((part) => part !== '')
    .join(' · ')
const reviewer = computed(() => (chrome.value?.reviewer ? reviewerText(chrome.value.reviewer) : t('settings.reviewer.off')))
const extended = computed(() => {
  const value = chrome.value?.extendedApproval
  if (!value) return t('settings.reviewer.off')
  const trigger = value.trigger ? ` · ${t('settings.reviewer.trigger', { trigger: value.trigger })}` : ''
  return `${reviewerText(value)}${trigger}`
})
const thinkingNote = computed(() => (chrome.value && chrome.value.thinking === '' ? t('settings.thinking.unsupported') : undefined))
</script>

<template>
  <div class="divide-y">
    <p v-if="locked" class="text-muted-foreground pb-3 text-sm">{{ t('settings.readonly') }}</p>

    <SettingRow :label="t('settings.mode')" :help="t('settings.mode.help')" :note="pendingMode" label-for="set-mode">
      <ChoiceSelect id="set-mode" :options="modes" :model-value="currentMode" :disabled="locked" @change="setMode" />
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
        @change="(v) => run(`/approval ${v}`)"
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
        @change="(v) => run(`/model ${v}`)"
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
        @change="(v) => run(`/thinking ${v}`)"
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
        @change="(v) => run(`/context ${v}`)"
      />
    </SettingRow>

    <SettingRow v-if="tiers.length > 0" :label="t('settings.tier')" :note="pendingTier" label-for="set-tier">
      <ChoiceSelect
        id="set-tier"
        :options="tiers"
        :model-value="currentTier"
        :disabled="locked || adminLocked"
        @change="(v) => run(`/tier ${v}`)"
      />
    </SettingRow>

    <SettingRow v-if="speeds.length > 0" :label="t('settings.speed')" :note="pendingSpeed" label-for="set-speed">
      <ChoiceSelect
        id="set-speed"
        :options="speeds"
        :model-value="currentSpeed"
        :disabled="locked || adminLocked"
        @change="(v) => run(`/speed ${v}`)"
      />
    </SettingRow>

    <SettingRow :label="t('settings.reviewer')" :help="t('settings.reviewer.help')">
      <p class="min-w-0 text-sm break-words sm:text-right">{{ reviewer }}</p>
    </SettingRow>

    <SettingRow :label="t('settings.extended')">
      <p class="min-w-0 text-sm break-words sm:text-right">{{ extended }}</p>
    </SettingRow>

    <Separator class="hidden" />
  </div>
</template>
