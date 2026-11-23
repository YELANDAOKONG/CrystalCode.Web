<script setup lang="ts">
import { Switch } from '@/components/ui/switch'
import { t, useLocale } from '@/i18n'
import { DEFAULT_INK_COUNT, DEFAULT_INK_SHOWER_COUNT, DEFAULT_INK_SHOWER_SPEED, DEFAULT_INK_SPEED, INK_SHAPES, INK_SPINNER_STYLES, useInk } from '@/theme/ink'
import ChoiceSelect from './ChoiceSelect.vue'
import RangeSetting from './RangeSetting.vue'
import SettingRow from './SettingRow.vue'
import SettingsGroup from './SettingsGroup.vue'

const ink = useInk()
const { locale } = useLocale()

const placementOptions = () => [
  { value: 'behind', label: t('settings.sakura.placement.behind'), help: t('settings.sakura.placement.behind.help') },
  { value: 'idle', label: t('settings.sakura.placement.idle'), help: t('settings.sakura.placement.idle.help') },
  { value: 'both', label: t('settings.sakura.placement.both'), help: t('settings.sakura.placement.both.help') },
  { value: 'over', label: t('settings.sakura.placement.over'), help: t('settings.sakura.placement.over.help') },
]
const shapeOptions = () => INK_SHAPES.map((value) => ({ value, label: t(`settings.ink.shape.${value}`), help: '' }))
const spinnerOptions = () => INK_SPINNER_STYLES.map((value) => ({ value, label: t(`settings.ink.spinnerStyle.${value}`), help: '' }))
</script>

<template>
  <SettingsGroup :title="t('settings.palette.ink')" scope="browser">
    <SettingRow :label="t('settings.ink.font')" :help="t('settings.ink.font.help')" label-for="set-ink-font">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-ink-font" :model-value="ink.font.current.value" @update:model-value="(value) => ink.font.set(value === true)" />
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.ink.artwork')" :help="t('settings.ink.artwork.help')" label-for="set-ink-artwork">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-ink-artwork" :model-value="ink.artwork.current.value" @update:model-value="(value) => ink.artwork.set(value === true)" />
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.ink.artworkFirst')" :help="t('settings.ink.artworkFirst.help')" label-for="set-ink-artwork-first">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-ink-artwork-first" :model-value="ink.artworkFirst.current.value" :disabled="!ink.artwork.current.value" @update:model-value="(value) => ink.artworkFirst.set(value === true)" />
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.ink.particles')" :help="t('settings.ink.particles.help')" label-for="set-ink-particles">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-ink-particles" :model-value="ink.particles.current.value" @update:model-value="(value) => ink.particles.set(value === true)" />
      </div>
    </SettingRow>
    <template v-if="ink.particles.current.value">
      <SettingRow :label="t('settings.ink.shape')" label-for="set-ink-shape">
        <ChoiceSelect id="set-ink-shape" :key="locale" :options="shapeOptions()" :model-value="ink.shape.current.value" @change="ink.shape.set" />
      </SettingRow>
      <SettingRow :label="t('settings.ink.placement')" label-for="set-ink-placement">
        <ChoiceSelect id="set-ink-placement" :key="locale" :options="placementOptions()" :model-value="ink.placement.current.value" @change="ink.placement.set" />
      </SettingRow>
      <RangeSetting :label="t('settings.pride.count')" :help="t('settings.pride.count.help')" :model-value="ink.count.current.value" :default-value="DEFAULT_INK_COUNT" :min="4" :max="100" unit="" @update:model-value="ink.count.set" />
      <RangeSetting :label="t('settings.pride.speed')" :help="t('settings.pride.speed.help')" :model-value="ink.speed.current.value" :default-value="DEFAULT_INK_SPEED" :min="50" :max="250" unit="%" @update:model-value="ink.speed.set" />
    </template>
    <SettingRow :label="t('settings.ink.shower')" :help="t('settings.ink.shower.help')" label-for="set-ink-shower">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-ink-shower" :model-value="ink.shower.current.value" @update:model-value="(value) => ink.shower.set(value === true)" />
      </div>
    </SettingRow>
    <template v-if="ink.shower.current.value">
      <RangeSetting :label="t('settings.pride.showerCount')" :help="t('settings.pride.showerCount.help')" :model-value="ink.showerCount.current.value" :default-value="DEFAULT_INK_SHOWER_COUNT" :min="4" :max="100" unit="" @update:model-value="ink.showerCount.set" />
      <RangeSetting :label="t('settings.pride.showerSpeed')" :help="t('settings.pride.showerSpeed.help')" :model-value="ink.showerSpeed.current.value" :default-value="DEFAULT_INK_SHOWER_SPEED" :min="50" :max="250" unit="%" @update:model-value="ink.showerSpeed.set" />
    </template>
    <SettingRow :label="t('settings.ink.spinner')" :help="t('settings.ink.spinner.help')" label-for="set-ink-spinner">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-ink-spinner" :model-value="ink.spinner.current.value" @update:model-value="(value) => ink.spinner.set(value === true)" />
      </div>
    </SettingRow>
    <SettingRow v-if="ink.spinner.current.value" :label="t('settings.pride.spinnerStyle')" :help="t('settings.pride.spinnerStyle.help')" label-for="set-ink-spinner-style">
      <ChoiceSelect id="set-ink-spinner-style" :key="locale" :options="spinnerOptions()" :model-value="ink.spinnerStyle.current.value" @change="ink.spinnerStyle.set" />
    </SettingRow>
  </SettingsGroup>
</template>
