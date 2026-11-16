<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { Switch } from '@/components/ui/switch'
import { useDisplayStyle } from '@/composables/display-style'
import { t, type MessageKey } from '@/i18n'
import type { Preferences } from '@/protocol/types'
import SettingRow from './SettingRow.vue'
import SettingsGroup from './SettingsGroup.vue'

const model = server.model
const { canOperate, isAdmin } = server
const { groupTools, foldThinking, setGroupTools, setFoldThinking } = useDisplayStyle()

// The wire names are the engine's `VerboseTarget` values.
const TARGETS = [
  ['tools', 'verboseTools'],
  ['commands', 'verboseCommands'],
  ['results', 'verboseResults'],
  ['calls', 'verboseCalls'],
  ['approvals', 'verboseApprovals'],
  ['review', 'verboseReview'],
  ['thinking', 'verboseThinking'],
] as const satisfies readonly (readonly [string, keyof Preferences])[]

const preferences = computed(() => model.preferences)

function toggle(target: string, enabled: boolean | 'indeterminate'): void {
  void server.setVerbose(target, enabled === true)
}

// /tokens takes on or off. Admin: it writes config.json.
const setTokens = (on: boolean | 'indeterminate') => void server.send(`/tokens ${on === true ? 'on' : 'off'}`)
</script>

<template>
  <div class="space-y-8">
    <SettingsGroup v-if="preferences" :title="t('settings.verbose')" :help="t('settings.verbose.help')" scope="server">
      <SettingRow
        v-for="[target, field] in TARGETS"
        :key="target"
        :label="t(`verbose.${target}` as MessageKey)"
        :label-for="`verbose-${target}`"
      >
        <div class="flex items-center sm:justify-end">
          <Switch
            :id="`verbose-${target}`"
            :model-value="preferences[field] as boolean"
            :disabled="!canOperate"
            @update:model-value="(value) => toggle(target, value)"
          />
        </div>
      </SettingRow>
      <SettingRow
        :label="t('settings.tokens')"
        :help="t('settings.tokens.help')"
        :note="canOperate && !isAdmin ? t('settings.adminOnly') : undefined"
        label-for="set-tokens"
      >
        <div class="flex items-center sm:justify-end">
          <Switch id="set-tokens" :model-value="preferences.estimatedTokens" :disabled="!isAdmin" @update:model-value="setTokens" />
        </div>
      </SettingRow>
    </SettingsGroup>

    <SettingsGroup :title="t('settings.group.layout')" scope="browser">
      <SettingRow :label="t('settings.groupTools')" :help="t('settings.groupTools.help')" label-for="set-group-tools">
        <div class="flex items-center sm:justify-end">
          <Switch id="set-group-tools" :model-value="groupTools" @update:model-value="(value) => setGroupTools(value === true)" />
        </div>
      </SettingRow>
      <SettingRow :label="t('settings.foldThinking')" :help="t('settings.foldThinking.help')" label-for="set-fold-thinking">
        <div class="flex items-center sm:justify-end">
          <Switch id="set-fold-thinking" :model-value="foldThinking" @update:model-value="(value) => setFoldThinking(value === true)" />
        </div>
      </SettingRow>
    </SettingsGroup>
  </div>
</template>
