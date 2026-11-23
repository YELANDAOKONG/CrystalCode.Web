<script setup lang="ts">
import { Switch } from '@/components/ui/switch'
import { t, useLocale } from '@/i18n'
import { DEFAULT_LAVENDER_COUNT, DEFAULT_LAVENDER_SHOWER_COUNT, DEFAULT_LAVENDER_SHOWER_SPEED, DEFAULT_LAVENDER_SPEED, LAVENDER_SHAPES, LAVENDER_SPINNER_STYLES, useLavender } from '@/theme/lavender'
import ChoiceSelect from './ChoiceSelect.vue'
import RangeSetting from './RangeSetting.vue'
import SettingRow from './SettingRow.vue'
import SettingsGroup from './SettingsGroup.vue'

const lavender = useLavender()
const { locale } = useLocale()

const placementOptions = () => [
  { value: 'behind', label: t('settings.sakura.placement.behind'), help: t('settings.sakura.placement.behind.help') },
  { value: 'idle', label: t('settings.sakura.placement.idle'), help: t('settings.sakura.placement.idle.help') },
  { value: 'both', label: t('settings.sakura.placement.both'), help: t('settings.sakura.placement.both.help') },
  { value: 'over', label: t('settings.sakura.placement.over'), help: t('settings.sakura.placement.over.help') },
]
const shapeOptions = () => LAVENDER_SHAPES.map((value) => ({ value, label: t(`settings.lavender.shape.${value}`), help: '' }))
const spinnerOptions = () => LAVENDER_SPINNER_STYLES.map((value) => ({ value, label: t(`settings.lavender.spinnerStyle.${value}`), help: '' }))
</script>

<template>
  <SettingsGroup :title="t('settings.palette.lavender')" scope="browser">
    <SettingRow :label="t('settings.lavender.font')" :help="t('settings.lavender.font.help')" label-for="set-lavender-font">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-lavender-font" :model-value="lavender.font.current.value" @update:model-value="(value) => lavender.font.set(value === true)" />
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.artwork')" :help="t('settings.lavender.artwork.help')" label-for="set-lavender-artwork">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-lavender-artwork" :model-value="lavender.artwork.current.value" @update:model-value="(value) => lavender.artwork.set(value === true)" />
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.artworkFirst')" :help="t('settings.artworkFirst.help')" label-for="set-lavender-artwork-first">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-lavender-artwork-first" :model-value="lavender.artworkFirst.current.value" :disabled="!lavender.artwork.current.value" @update:model-value="(value) => lavender.artworkFirst.set(value === true)" />
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.lavender.particles')" :help="t('settings.lavender.particles.help')" label-for="set-lavender-particles">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-lavender-particles" :model-value="lavender.particles.current.value" @update:model-value="(value) => lavender.particles.set(value === true)" />
      </div>
    </SettingRow>
    <template v-if="lavender.particles.current.value">
      <SettingRow :label="t('settings.lavender.shape')" label-for="set-lavender-shape">
        <ChoiceSelect id="set-lavender-shape" :key="locale" :options="shapeOptions()" :model-value="lavender.shape.current.value" @change="lavender.shape.set" />
      </SettingRow>
      <SettingRow :label="t('settings.lavender.placement')" label-for="set-lavender-placement">
        <ChoiceSelect id="set-lavender-placement" :key="locale" :options="placementOptions()" :model-value="lavender.placement.current.value" @change="lavender.placement.set" />
      </SettingRow>
      <RangeSetting :label="t('settings.pride.count')" :help="t('settings.pride.count.help')" :model-value="lavender.count.current.value" :default-value="DEFAULT_LAVENDER_COUNT" :min="4" :max="100" unit="" @update:model-value="lavender.count.set" />
      <RangeSetting :label="t('settings.pride.speed')" :help="t('settings.pride.speed.help')" :model-value="lavender.speed.current.value" :default-value="DEFAULT_LAVENDER_SPEED" :min="50" :max="250" unit="%" @update:model-value="lavender.speed.set" />
    </template>
    <SettingRow :label="t('settings.lavender.shower')" :help="t('settings.lavender.shower.help')" label-for="set-lavender-shower">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-lavender-shower" :model-value="lavender.shower.current.value" @update:model-value="(value) => lavender.shower.set(value === true)" />
      </div>
    </SettingRow>
    <template v-if="lavender.shower.current.value">
      <RangeSetting :label="t('settings.pride.showerCount')" :help="t('settings.pride.showerCount.help')" :model-value="lavender.showerCount.current.value" :default-value="DEFAULT_LAVENDER_SHOWER_COUNT" :min="4" :max="100" unit="" @update:model-value="lavender.showerCount.set" />
      <RangeSetting :label="t('settings.pride.showerSpeed')" :help="t('settings.pride.showerSpeed.help')" :model-value="lavender.showerSpeed.current.value" :default-value="DEFAULT_LAVENDER_SHOWER_SPEED" :min="50" :max="250" unit="%" @update:model-value="lavender.showerSpeed.set" />
    </template>
    <SettingRow :label="t('settings.lavender.spinner')" :help="t('settings.lavender.spinner.help')" label-for="set-lavender-spinner">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-lavender-spinner" :model-value="lavender.spinner.current.value" @update:model-value="(value) => lavender.spinner.set(value === true)" />
      </div>
    </SettingRow>
    <SettingRow v-if="lavender.spinner.current.value" :label="t('settings.pride.spinnerStyle')" :help="t('settings.pride.spinnerStyle.help')" label-for="set-lavender-spinner-style">
      <ChoiceSelect id="set-lavender-spinner-style" :key="locale" :options="spinnerOptions()" :model-value="lavender.spinnerStyle.current.value" @change="lavender.spinnerStyle.set" />
    </SettingRow>
  </SettingsGroup>
</template>
