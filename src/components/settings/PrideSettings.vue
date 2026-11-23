<script setup lang="ts">
import { t } from '@/i18n'
import { DEFAULT_PRIDE_COUNT, DEFAULT_PRIDE_SHOWER_COUNT, DEFAULT_PRIDE_SHOWER_SPEED, DEFAULT_PRIDE_SPEED, isPrideShape, isPrideSpinnerStyle, usePride } from '@/theme/pride'
import { isPetalPlacement } from '@/theme/sakura'
import { Switch } from '@/components/ui/switch'
import ChoiceSelect from './ChoiceSelect.vue'
import RangeSetting from './RangeSetting.vue'
import SettingRow from './SettingRow.vue'
import SettingsGroup from './SettingsGroup.vue'

const pride = usePride()

// The placement choices read the same for any falling particle, so they are shared with Sakura.
const placementOptions = () => [
  { value: 'behind', label: t('settings.sakura.placement.behind'), help: t('settings.sakura.placement.behind.help') },
  { value: 'idle', label: t('settings.sakura.placement.idle'), help: t('settings.sakura.placement.idle.help') },
  { value: 'both', label: t('settings.sakura.placement.both'), help: t('settings.sakura.placement.both.help') },
  { value: 'over', label: t('settings.sakura.placement.over'), help: t('settings.sakura.placement.over.help') },
]

function setPlacement(value: string): void {
  if (isPetalPlacement(value)) pride.setPlacement(value)
}

const shapeOptions = () => [
  { value: 'mix', label: t('settings.pride.shape.mix'), help: t('settings.pride.shape.mix.help') },
  { value: 'heart', label: t('settings.pride.shape.heart'), help: t('settings.pride.shape.heart.help') },
  { value: 'sparkle', label: t('settings.pride.shape.sparkle'), help: t('settings.pride.shape.sparkle.help') },
  { value: 'naruto', label: t('settings.pride.shape.naruto'), help: t('settings.pride.shape.naruto.help') },
]

const spinnerOptions = () => [
  { value: 'spin', label: t('settings.pride.spinnerStyle.spin'), help: t('settings.pride.spinnerStyle.spin.help') },
  { value: 'beat', label: t('settings.pride.spinnerStyle.beat'), help: t('settings.pride.spinnerStyle.beat.help') },
  { value: 'orbit', label: t('settings.pride.spinnerStyle.orbit'), help: t('settings.pride.spinnerStyle.orbit.help') },
  { value: 'breathe', label: t('settings.pride.spinnerStyle.breathe'), help: t('settings.pride.spinnerStyle.breathe.help') },
]

function setShape(value: string): void {
  if (isPrideShape(value)) pride.setShape(value)
}

function setSpinnerStyle(value: string): void {
  if (isPrideSpinnerStyle(value)) pride.setSpinnerStyle(value)
}
</script>

<template>
  <SettingsGroup :title="t('settings.palette.pride')" scope="browser">
    <SettingRow :label="t('settings.pride.font')" :help="t('settings.pride.font.help')" label-for="set-pride-font">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-pride-font" :model-value="pride.roundedFont.value" @update:model-value="(value) => pride.setRoundedFont(value === true)" />
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.artwork')" :help="t('settings.pride.artwork.help')" label-for="set-pride-artwork">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-pride-artwork" :model-value="pride.artwork.value" @update:model-value="(value) => pride.setArtwork(value === true)" />
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.artworkFirst')" :help="t('settings.artworkFirst.help')" label-for="set-pride-artwork-first">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-pride-artwork-first" :model-value="pride.artworkFirst.value" :disabled="!pride.artwork.value" @update:model-value="(value) => pride.setArtworkFirst(value === true)" />
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.pride.particles')" :help="t('settings.pride.particles.help')" label-for="set-pride-particles">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-pride-particles" :model-value="pride.particles.value" @update:model-value="(value) => pride.setParticles(value === true)" />
      </div>
    </SettingRow>
    <template v-if="pride.particles.value">
      <SettingRow :label="t('settings.pride.shape')" label-for="set-pride-shape">
        <ChoiceSelect id="set-pride-shape" :options="shapeOptions()" :model-value="pride.shape.value" @change="setShape" />
      </SettingRow>
      <SettingRow :label="t('settings.pride.placement')" label-for="set-pride-placement">
        <ChoiceSelect id="set-pride-placement" :options="placementOptions()" :model-value="pride.placement.value" @change="setPlacement" />
      </SettingRow>
      <RangeSetting :label="t('settings.pride.count')" :help="t('settings.pride.count.help')" :model-value="pride.count.value" :default-value="DEFAULT_PRIDE_COUNT" :min="4" :max="100" unit="" @update:model-value="pride.setCount" />
      <RangeSetting :label="t('settings.pride.speed')" :help="t('settings.pride.speed.help')" :model-value="pride.speed.value" :default-value="DEFAULT_PRIDE_SPEED" :min="50" :max="250" unit="%" @update:model-value="pride.setSpeed" />
    </template>
    <SettingRow :label="t('settings.pride.shower')" :help="t('settings.pride.shower.help')" label-for="set-pride-shower">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-pride-shower" :model-value="pride.shower.value" @update:model-value="(value) => pride.setShower(value === true)" />
      </div>
    </SettingRow>
    <template v-if="pride.shower.value">
      <RangeSetting :label="t('settings.pride.showerCount')" :help="t('settings.pride.showerCount.help')" :model-value="pride.showerCount.value" :default-value="DEFAULT_PRIDE_SHOWER_COUNT" :min="4" :max="100" unit="" @update:model-value="pride.setShowerCount" />
      <RangeSetting :label="t('settings.pride.showerSpeed')" :help="t('settings.pride.showerSpeed.help')" :model-value="pride.showerSpeed.value" :default-value="DEFAULT_PRIDE_SHOWER_SPEED" :min="50" :max="250" unit="%" @update:model-value="pride.setShowerSpeed" />
    </template>
    <SettingRow :label="t('settings.pride.spinner')" :help="t('settings.pride.spinner.help')" label-for="set-pride-spinner">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-pride-spinner" :model-value="pride.spinner.value" @update:model-value="(value) => pride.setSpinner(value === true)" />
      </div>
    </SettingRow>
    <SettingRow v-if="pride.spinner.value" :label="t('settings.pride.spinnerStyle')" :help="t('settings.pride.spinnerStyle.help')" label-for="set-pride-spinner-style">
      <ChoiceSelect id="set-pride-spinner-style" :options="spinnerOptions()" :model-value="pride.spinnerStyle.value" @change="setSpinnerStyle" />
    </SettingRow>
  </SettingsGroup>
</template>
