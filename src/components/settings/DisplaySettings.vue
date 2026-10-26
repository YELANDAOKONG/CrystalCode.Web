<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { Switch } from '@/components/ui/switch'
import { t, type MessageKey } from '@/i18n'
import type { Preferences } from '@/protocol/types'

const model = server.model
const { canOperate } = server

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
const { isAdmin } = server
const setTokens = (on: boolean | 'indeterminate') => void server.send(`/tokens ${on === true ? 'on' : 'off'}`)
</script>

<template>
  <div v-if="preferences" class="space-y-6">
    <p v-if="!canOperate" class="text-muted-foreground text-sm">{{ t('settings.readonly') }}</p>

    <section aria-labelledby="verbose-heading">
      <h3 id="verbose-heading" class="text-sm font-medium">{{ t('settings.verbose') }}</h3>
      <p class="text-muted-foreground mt-0.5 mb-2 text-xs">{{ t('settings.verbose.help') }}</p>
      <ul class="divide-y">
        <li v-for="[target, field] in TARGETS" :key="target" class="flex min-h-11 items-center justify-between gap-3 py-1.5">
          <label :for="`verbose-${target}`" class="flex-1 text-sm">{{ t(`verbose.${target}` as MessageKey) }}</label>
          <Switch
            :id="`verbose-${target}`"
            :model-value="preferences[field] as boolean"
            :disabled="!canOperate"
            @update:model-value="(value) => toggle(target, value)"
          />
        </li>
      </ul>
    </section>

    <section aria-labelledby="tokens-heading">
      <div class="flex min-h-11 items-center justify-between gap-3">
        <div class="min-w-0">
          <h3 id="tokens-heading" class="text-sm font-medium"><label for="set-tokens">{{ t('settings.tokens') }}</label></h3>
          <p class="text-muted-foreground mt-0.5 text-xs">{{ t('settings.tokens.help') }}</p>
          <p v-if="canOperate && !isAdmin" class="text-muted-foreground mt-0.5 text-xs">{{ t('settings.adminOnly') }}</p>
        </div>
        <Switch id="set-tokens" :model-value="preferences.estimatedTokens" :disabled="!isAdmin" @update:model-value="setTokens" />
      </div>
    </section>
  </div>
</template>
