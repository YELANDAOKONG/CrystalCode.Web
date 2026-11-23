<script setup lang="ts">
import LavenderSpinner from '@/components/ambient/LavenderSpinner.vue'
import { Switch } from '@/components/ui/switch'
import { t, useLocale } from '@/i18n'
import { LAVENDER_PLACEMENTS, LAVENDER_SHAPES, LAVENDER_SPINNER_STYLES, useLavender } from '@/theme/lavender'
import ChoiceSelect from './ChoiceSelect.vue'
import RangeSetting from './RangeSetting.vue'
import SettingRow from './SettingRow.vue'
import SettingsGroup from './SettingsGroup.vue'

const lavender = useLavender()
const { locale } = useLocale()
const placements = () => LAVENDER_PLACEMENTS.map((value) => ({
  value,
  label: t(`settings.sakura.placement.${value}`),
  help: t(`settings.sakura.placement.${value}.help`),
}))
const shapes = () => LAVENDER_SHAPES.map((value) => ({ value, label: t(`settings.lavender.shape.${value}`), help: '' }))
const spinnerStyles = () => LAVENDER_SPINNER_STYLES.map((value) => ({ value, label: t(`settings.lavender.spinnerStyle.${value}`), help: '' }))
const driftRanges = [
  { label: 'settings.lavender.count', unit: '', setting: lavender.count },
  { label: 'settings.lavender.speed', unit: '%', setting: lavender.speed },
] as const
const showerRanges = [
  { label: 'settings.lavender.showerCount', unit: '', setting: lavender.showerCount },
  { label: 'settings.lavender.showerSpeed', unit: '%', setting: lavender.showerSpeed },
] as const
</script>

<template>
  <div class="space-y-8">
    <SettingsGroup :title="t('settings.palette.lavender')" scope="browser">
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
      <SettingRow :label="t('settings.lavender.font')" :help="t('settings.lavender.font.help')" label-for="set-lavender-font">
        <div class="flex items-center sm:justify-end">
          <Switch id="set-lavender-font" :model-value="lavender.font.current.value" @update:model-value="(value) => lavender.font.set(value === true)" />
        </div>
      </SettingRow>
    </SettingsGroup>
    <SettingsGroup :title="t('settings.lavender.drift')">
      <SettingRow :label="t('settings.lavender.particles')" :help="t('settings.lavender.particles.help')" label-for="set-lavender-particles">
        <div class="flex items-center sm:justify-end">
          <Switch id="set-lavender-particles" :model-value="lavender.particles.current.value" @update:model-value="(value) => lavender.particles.set(value === true)" />
        </div>
      </SettingRow>
      <template v-if="lavender.particles.current.value">
        <SettingRow :label="t('settings.lavender.shape')" label-for="set-lavender-shape">
          <ChoiceSelect id="set-lavender-shape" :key="locale" :options="shapes()" :model-value="lavender.shape.current.value" @change="lavender.shape.set" />
        </SettingRow>
        <SettingRow :label="t('settings.lavender.placement')" label-for="set-lavender-placement">
          <ChoiceSelect id="set-lavender-placement" :key="locale" :options="placements()" :model-value="lavender.placement.current.value" @change="lavender.placement.set" />
        </SettingRow>
        <RangeSetting
          v-for="item in driftRanges"
          :key="item.label"
          :label="t(item.label)"
          :model-value="item.setting.current.value"
          :default-value="item.setting.defaultValue"
          :min="item.setting.min"
          :max="item.setting.max"
          :unit="item.unit"
          @update:model-value="item.setting.set"
        />
      </template>
    </SettingsGroup>
    <SettingsGroup :title="t('settings.lavender.completion')">
      <SettingRow :label="t('settings.lavender.shower')" :help="t('settings.lavender.shower.help')" label-for="set-lavender-shower">
        <div class="flex items-center sm:justify-end">
          <Switch id="set-lavender-shower" :model-value="lavender.shower.current.value" @update:model-value="(value) => lavender.shower.set(value === true)" />
        </div>
      </SettingRow>
      <template v-if="lavender.shower.current.value">
        <SettingRow :label="t('settings.lavender.showerShape')" label-for="set-lavender-shower-shape">
          <ChoiceSelect id="set-lavender-shower-shape" :key="locale" :options="shapes()" :model-value="lavender.showerShape.current.value" @change="lavender.showerShape.set" />
        </SettingRow>
        <RangeSetting
          v-for="item in showerRanges"
          :key="item.label"
          :label="t(item.label)"
          :model-value="item.setting.current.value"
          :default-value="item.setting.defaultValue"
          :min="item.setting.min"
          :max="item.setting.max"
          :unit="item.unit"
          @update:model-value="item.setting.set"
        />
      </template>
    </SettingsGroup>
    <SettingsGroup :title="t('settings.lavender.progress')">
      <SettingRow :label="t('settings.lavender.spinner')" :help="t('settings.lavender.spinner.help')" label-for="set-lavender-spinner">
        <div class="flex items-center sm:justify-end">
          <Switch id="set-lavender-spinner" :model-value="lavender.spinner.current.value" @update:model-value="(value) => lavender.spinner.set(value === true)" />
        </div>
      </SettingRow>
      <SettingRow v-if="lavender.spinner.current.value" :label="t('settings.pride.spinnerStyle')" label-for="set-lavender-spinner-style">
        <div class="flex items-center gap-2">
          <div class="min-w-0 flex-1">
            <ChoiceSelect id="set-lavender-spinner-style" :key="locale" :options="spinnerStyles()" :model-value="lavender.spinnerStyle.current.value" @change="lavender.spinnerStyle.set" />
          </div>
          <LavenderSpinner :variant="lavender.spinnerStyle.current.value" class="size-5 shrink-0" />
        </div>
      </SettingRow>
    </SettingsGroup>
  </div>
</template>
