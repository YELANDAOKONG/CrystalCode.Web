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
// `GET /options`, where the server lists the stored model and its available
// tuning even while the feature is off. A change goes
// through `PUT /options/{id}`, which runs the terminal's own command.
const props = defineProps<{
  slot: 'approval' | 'extended' | 'compaction' | 'topic' | 'image' | 'audio' | 'video' | 'document' | 'pursue' | 'pursue_compaction'
  disabled?: boolean
}>()

const model = server.model
const { canOperate, isAdmin } = server

// The server names a slot's options `<slot>_thinking`, `_tier`, `_speed`, and
// `_context`. Only the model option's own id differs.
const MODEL_ID = {
  approval: 'approval_model',
  extended: 'extended_model',
  compaction: 'compaction_model',
  topic: 'topic_model',
  image: 'image_model',
  audio: 'audio_model',
  video: 'video_model',
  document: 'document_model',
  pursue: 'pursue_model',
  pursue_compaction: 'pursue_compaction_model',
} as const
const ids = computed(() => ({
  model: props.slot === 'extended' && !model.options.some((entry) => entry.id === 'extended_model') ? 'extended_approval' : MODEL_ID[props.slot],
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

// A value with no command cannot be chosen. The server lists it only while it
// is the current value, so keep it visible but never offer it as a change.
function choices(option: SessionOption | undefined, models = false): Option[] {
  return (option?.values ?? []).filter((value) => value.command !== '' || value.value === option?.current).map((value) => {
    const special = models && (value.value === 'off' || value.value === 'session')
    return {
      value: value.value,
      // Off and unset are the page's own words; every other name is the server's.
      label: special
        ? t(value.value === 'session'
          ? props.slot === 'pursue_compaction' ? 'settings.pursue.compaction.inherit' : 'settings.off.session'
          : (OFF_LABEL[props.slot] ?? 'settings.reviewer.off'))
        : value.value === 'unset'
          ? t('settings.option.none')
          : value.name,
      help: '',
      ...(value.group ? { group: value.group } : {}),
    }
  })
}

const modelOption = computed(() => find(ids.value.model))
const SWITCH_ID: Partial<Record<typeof props.slot, string>> = {
  approval: 'approval_model_enabled', extended: 'extended_approval', compaction: 'compaction_model_enabled',
  topic: 'topic', image: 'image_model_enabled', audio: 'audio_model_enabled', video: 'video_model_enabled', document: 'document_model_enabled',
}
const enabledOption = computed(() => {
  const option = find(SWITCH_ID[props.slot] ?? '')
  return option?.switch ? option : undefined
})
const thinking = computed(() => find(ids.value.thinking))
const tier = computed(() => find(ids.value.tier))
const speed = computed(() => find(ids.value.speed))
const context = computed(() => find(ids.value.context))

const locked = computed(() => !canOperate.value || !isAdmin.value || props.disabled || server.phase.value !== 'live')
// The engine refuses a change to the compaction model, or to any model's tier
// or speed, while a turn runs.
const turnBusy = computed(() => model.turnActive)
const pursueSlot = computed(() => props.slot === 'pursue' || props.slot === 'pursue_compaction')
const busyLocked = computed(() => props.slot === 'compaction' || pursueSlot.value)
const modelLocked = computed(() => locked.value || (busyLocked.value && turnBusy.value) || (pursueSlot.value && model.activity === 'compacting'))
const slotLocked = computed(() => locked.value || turnBusy.value)

const { busy, run: track } = useBusy()
const set = (option: SessionOption | undefined, value: string | boolean) => {
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
  document: ['settings.document', 'settings.document.help'],
  pursue: ['settings.pursue.model', 'settings.pursue.model.help'],
  pursue_compaction: ['settings.pursue.compaction', 'settings.pursue.compaction.help'],
} as const satisfies Record<string, readonly [MessageKey, MessageKey]>
const title = computed(() => t(TITLES[props.slot][0]))
const help = computed(() => t(TITLES[props.slot][1]))
const switchTitle = computed(() => t(({
  approval: 'settings.enable.approval', extended: 'settings.enable.extended', compaction: 'settings.enable.compaction',
  topic: 'settings.opt.topic', image: 'settings.enable.image', audio: 'settings.enable.audio', video: 'settings.enable.video', document: 'settings.enable.document',
} as Partial<Record<typeof props.slot, MessageKey>>)[props.slot] ?? 'settings.opt.topic'))
const note = computed(() =>
  !isAdmin.value && canOperate.value ? t('settings.adminOnly') : turnBusy.value && busyLocked.value ? t('settings.reviewer.busy') : undefined,
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
  <section v-if="modelOption" :aria-labelledby="enabledOption ? id('heading') : undefined" :class="enabledOption ? 'py-4' : ''">
    <div v-if="enabledOption" class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h3 :id="id('heading')" class="text-sm font-semibold">{{ switchTitle }}</h3>
        <p class="text-muted-foreground mt-1 text-xs leading-snug">{{ help }}</p>
        <p v-if="modelOption.current === 'unset'" class="text-muted-foreground mt-1 text-xs leading-snug">{{ t('settings.model.selectFirst') }}</p>
        <p v-else-if="enabledOption.current === 'off'" class="text-muted-foreground mt-1 text-xs leading-snug">{{ t('settings.model.disabled.help') }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <Spinner v-if="busy(enabledOption.id)" class="text-muted-foreground size-4 motion-reduce:animate-none" />
        <Switch :id="id('enabled')" :aria-label="switchTitle" :model-value="enabledOption.current === 'on'" :aria-busy="busy(enabledOption.id) || undefined" :disabled="locked || busy(enabledOption.id) || (enabledOption.current === 'off' && modelOption.current === 'unset')" @update:model-value="(on) => set(enabledOption, on === true)" />
      </div>
    </div>
    <div :class="enabledOption ? 'bg-muted/40 mt-3 rounded-md px-3 sm:px-4' : ''">
    <SettingRow :label="enabledOption ? t('settings.model') : title" :help="enabledOption ? undefined : help" :note="note" :label-for="id('model')">
      <ChoiceSelect :id="id('model')" :options="choices(modelOption, true)" :model-value="modelOption.current" :disabled="modelLocked" :loading="busy(modelOption.id)" @change="(v) => set(modelOption, v)" />
    </SettingRow>

    <div v-if="thinking || tier || speed || context || extended" :class="enabledOption ? 'border-t' : 'border-l-2 pl-4'">
      <SettingRow v-if="thinking" :label="t('settings.thinking')" :label-for="id('thinking')">
        <ChoiceSelect :id="id('thinking')" :options="choices(thinking)" :model-value="thinking.current" :disabled="busyLocked ? slotLocked : locked" :loading="busy(thinking.id)" @change="(v) => set(thinking, v)" />
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
  </section>
</template>
