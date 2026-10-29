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
const props = defineProps<{
  slot: 'approval' | 'extended' | 'compaction' | 'topic' | 'image' | 'audio' | 'video'
  /** The feature this model belongs to is off. The choices stay editable, since they are saved for later. */
  dimmed?: boolean
}>()

const model = server.model
const { canOperate, isAdmin } = server

// The server names a slot's options `<slot>_thinking`, `_tier`, `_speed`, and
// `_context`. Only the model option's own id differs.
const MODEL_ID = {
  approval: 'approval_model',
  extended: 'extended_approval',
  compaction: 'compaction_model',
  topic: 'topic_model',
  image: 'image_model',
  audio: 'audio_model',
  video: 'video_model',
} as const
const ids = computed(() => ({
  model: MODEL_ID[props.slot],
  thinking: `${props.slot}_thinking`,
  tier: `${props.slot}_tier`,
  speed: `${props.slot}_speed`,
  context: `${props.slot}_context`,
}))

const find = (id: string): SessionOption | undefined => model.options.find((entry) => entry.id === id)

// The server's `off` and `session` values mean different things per slot, so
// the page names them itself. Compaction and topic share one meaning: write
// with the session model. The others have no model at all when it is off.
const OFF_LABEL: Record<string, MessageKey> = {
  approval: 'settings.off.approval',
  extended: 'settings.off.extended',
  compaction: 'settings.off.session',
  image: 'settings.off.resource',
  audio: 'settings.off.resource',
  video: 'settings.off.resource',
}

function choices(option: SessionOption | undefined, models = false): Option[] {
  return (option?.values ?? []).map((value) => {
    const special = models && (value.value === 'off' || value.value === 'session')
    return {
      value: value.value,
      // Off and unset are the page's own words; every other name is the server's.
      label: special
        ? t(value.value === 'session' ? 'settings.off.session' : (OFF_LABEL[props.slot] ?? 'settings.reviewer.off'))
        : value.value === 'unset'
          ? t('settings.option.none')
          : value.name,
      help: '',
      ...(value.group ? { group: value.group } : {}),
    }
  })
}

const modelOption = computed(() => find(ids.value.model))
const thinking = computed(() => find(ids.value.thinking))
const tier = computed(() => find(ids.value.tier))
const speed = computed(() => find(ids.value.speed))
const context = computed(() => find(ids.value.context))

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
  topic: ['settings.topic', 'settings.topic.help'],
  image: ['settings.image', 'settings.image.help'],
  audio: ['settings.audio', 'settings.audio.help'],
  video: ['settings.video', 'settings.video.help'],
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
  <div v-if="modelOption" :class="dimmed ? 'opacity-60' : ''">
    <SettingRow :label="title" :help="help" :note="note" :label-for="id('model')">
      <ChoiceSelect :id="id('model')" :options="choices(modelOption, true)" :model-value="modelOption.current" :disabled="modelLocked" :loading="busy(modelOption.id)" @change="(v) => set(modelOption, v)" />
    </SettingRow>

    <div v-if="thinking || tier || speed || context || extended" class="border-l-2 pl-4">
      <SettingRow v-if="thinking" :label="t('settings.thinking')" :label-for="id('thinking')">
        <ChoiceSelect :id="id('thinking')" :options="choices(thinking)" :model-value="thinking.current" :disabled="slot === 'compaction' ? slotLocked : locked" :loading="busy(thinking.id)" @change="(v) => set(thinking, v)" />
      </SettingRow>
      <SettingRow v-if="tier" :label="t('settings.tier')" :note="turnBusy ? t('settings.reviewer.busy') : undefined" :label-for="id('tier')">
        <ChoiceSelect :id="id('tier')" :options="choices(tier)" :model-value="tier.current" :disabled="slotLocked" :loading="busy(tier.id)" @change="(v) => set(tier, v)" />
      </SettingRow>
      <SettingRow v-if="speed" :label="t('settings.speed')" :note="turnBusy ? t('settings.reviewer.busy') : undefined" :label-for="id('speed')">
        <ChoiceSelect :id="id('speed')" :options="choices(speed)" :model-value="speed.current" :disabled="slotLocked" :loading="busy(speed.id)" @change="(v) => set(speed, v)" />
      </SettingRow>
      <SettingRow v-if="context" :label="t('settings.context')" :label-for="id('context')">
        <ChoiceSelect :id="id('context')" :options="choices(context)" :model-value="context.current" :disabled="slotLocked" :loading="busy(context.id)" @change="(v) => set(context, v)" />
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
