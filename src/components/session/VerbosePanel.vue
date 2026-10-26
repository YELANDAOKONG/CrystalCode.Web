<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { Switch } from '@/components/ui/switch'
import { t, type MessageKey } from '@/i18n'
import type { Preferences } from '@/protocol/types'

const model = server.model
const { canOperate } = server

// The wire target names are the engine's `VerboseTarget` values.
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
</script>

<template>
  <section v-if="preferences" aria-labelledby="verbose-title">
    <h2 id="verbose-title" class="mb-2 text-sm font-medium">{{ t('verbose.title') }}</h2>
    <p v-if="!canOperate" class="text-muted-foreground mb-2 text-xs">{{ t('verbose.needsOperate') }}</p>
    <ul class="space-y-1">
      <li v-for="[target, field] in TARGETS" :key="target" class="flex items-center justify-between gap-3 py-1">
        <label :for="`verbose-${target}`" class="text-sm">{{ t(`verbose.${target}` as MessageKey) }}</label>
        <Switch
          :id="`verbose-${target}`"
          :model-value="preferences[field] as boolean"
          :disabled="!canOperate"
          @update:model-value="(value) => toggle(target, value)"
        />
      </li>
    </ul>
  </section>
</template>
