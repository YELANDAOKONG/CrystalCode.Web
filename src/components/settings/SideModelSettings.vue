<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { useBusy } from '@/composables/busy'
import { t, type MessageKey } from '@/i18n'
import type { SessionOption } from '@/protocol/types'
import { findArguments, toOptions, type Option } from '@/session/settings'
import ChoiceSelect from './ChoiceSelect.vue'
import SettingRow from './SettingRow.vue'

// A model the session uses for a side job: the approval reviewer, the extended
// reviewer, or the compaction summarizer. Every choice comes from
// `GET /options`, where the server lists the model, and its thinking, tier,
// and speed only while that model is on and offers a choice. A change goes
// through `PUT /options/{id}`, which runs the terminal's own command.
const props = defineProps<{ slot: 'approval' | 'extended' | 'compaction' }>()

const model = server.model
const { canOperate, isAdmin } = server

const IDS = {
  approval: { model: 'approval_model', thinking: 'approval_thinking', tier: 'approval_tier', speed: 'approval_speed' },
  extended: { model: 'extended_approval', thinking: 'extended_thinking', tier: 'extended_tier', speed: 'extended_speed' },
  compaction: { model: 'compaction_model', thinking: 'compaction_thinking', tier: 'compaction_tier', speed: 'compaction_speed' },
} as const
const ids = computed(() => IDS[props.slot])

const find = (id: string): SessionOption | undefined => model.options.find((entry) => entry.id === id)

function choices(option: SessionOption | undefined, off = false): Option[] {
  return (option?.values ?? []).map((value) => ({
    value: value.value,
    // The server names a value in English. Off and unset are the page's own words.
    label: value.value === 'off' && off ? t('settings.reviewer.off') : value.value === 'unset' ? t('settings.option.none') : value.name,
    help: '',
    ...(value.group ? { group: value.group } : {}),
  }))
}

const modelOption = computed(() => find(ids.value.model))
const thinking = computed(() => find(ids.value.thinking))
const tier = computed(() => find(ids.value.tier))
const speed = computed(() => find(ids.value.speed))

const locked = computed(() => !canOperate.value || !isAdmin.value)
// The engine refuses a change to the compaction model, or to any model's tier
// or speed, while a turn runs.
const turnBusy = computed(() => model.turnActive)
const modelLocked = computed(() => locked.value || (props.slot === 'compaction' && turnBusy.value))
const slotLocked = computed(() => locked.value || turnBusy.value)

const { busy, run: track } = useBusy()
const set = (option: SessionOption | undefined, value: string) => {
  if (option) void track(option.id, () => server.setOption(option.id, value))
}

const TITLES = {
  approval: ['settings.reviewer', 'settings.reviewer.help'],
  extended: ['settings.extended', 'settings.extended.help'],
  compaction: ['settings.compaction', 'settings.compaction.help'],
} as const satisfies Record<string, readonly [MessageKey, MessageKey]>
const title = computed(() => t(TITLES[props.slot][0]))
const help = computed(() => t(TITLES[props.slot][1]))
const note = computed(() =>
  locked.value && canOperate.value ? t('settings.adminOnly') : turnBusy.value && props.slot === 'compaction' ? t('settings.reviewer.busy') : undefined,
)
const id = (name: string) => `${ids.value.model}-${name}`

// The extended reviewer also has a trigger level and a switch for showing it
// the first verdict. The server offers them only as commands.
const extended = computed(() => (props.slot === 'extended' ? model.chrome?.extendedApproval : null) ?? null)
const triggers = computed(() => toOptions(findArguments(model.commands, 'approval', 'extended', 'trigger')))
const currentTrigger = computed(() => triggers.value.find((entry) => entry.value === extended.value?.trigger.toLowerCase())?.value)
const run = (key: string, command: string) => void track(key, () => server.send(command))
</script>

<template>
  <div v-if="modelOption">
    <SettingRow :label="title" :help="help" :note="note" :label-for="id('model')">
      <ChoiceSelect :id="id('model')" :options="choices(modelOption, true)" :model-value="modelOption.current" :disabled="modelLocked" :loading="busy(modelOption.id)" @change="(v) => set(modelOption, v)" />
    </SettingRow>

    <div v-if="thinking || tier || speed || extended" class="border-l-2 pl-4">
      <SettingRow v-if="thinking" :label="t('settings.thinking')" :label-for="id('thinking')">
        <ChoiceSelect :id="id('thinking')" :options="choices(thinking)" :model-value="thinking.current" :disabled="slot === 'compaction' ? slotLocked : locked" :loading="busy(thinking.id)" @change="(v) => set(thinking, v)" />
      </SettingRow>
      <SettingRow v-if="tier" :label="t('settings.tier')" :note="turnBusy ? t('settings.reviewer.busy') : undefined" :label-for="id('tier')">
        <ChoiceSelect :id="id('tier')" :options="choices(tier)" :model-value="tier.current" :disabled="slotLocked" :loading="busy(tier.id)" @change="(v) => set(tier, v)" />
      </SettingRow>
      <SettingRow v-if="speed" :label="t('settings.speed')" :note="turnBusy ? t('settings.reviewer.busy') : undefined" :label-for="id('speed')">
        <ChoiceSelect :id="id('speed')" :options="choices(speed)" :model-value="speed.current" :disabled="slotLocked" :loading="busy(speed.id)" @change="(v) => set(speed, v)" />
      </SettingRow>
      <template v-if="extended">
        <SettingRow v-if="triggers.length" :label="t('settings.extended.trigger')" :help="t('settings.extended.trigger.help')" :label-for="id('trigger')">
          <ChoiceSelect :id="id('trigger')" :options="triggers" :model-value="currentTrigger" :disabled="locked" :loading="busy('trigger')" @change="(v) => run('trigger', `/approval extended trigger ${v}`)" />
        </SettingRow>
        <SettingRow :label="t('settings.extended.primary')" :help="t('settings.extended.primary.help')" :label-for="id('primary')">
          <div class="flex items-center sm:justify-end">
            <Spinner v-if="busy('primary')" class="text-muted-foreground mr-2 size-4 motion-reduce:animate-none" />
            <Switch
              :id="id('primary')"
              :model-value="extended.includePrimaryReview"
              :disabled="locked || busy('primary')"
              @update:model-value="(on) => run('primary', `/approval extended primary ${on === true ? 'on' : 'off'}`)"
            />
          </div>
        </SettingRow>
      </template>
    </div>
  </div>
</template>
