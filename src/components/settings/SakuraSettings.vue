<script setup lang="ts">
import { t } from '@/i18n'
import { DEFAULT_PETAL_COUNT, DEFAULT_PETAL_SPEED, DEFAULT_SHOWER_COUNT, DEFAULT_SHOWER_SPEED, isPetalPlacement, isSpinnerStyle, useSakura } from '@/theme/sakura'
import { Switch } from '@/components/ui/switch'
import ChoiceSelect from './ChoiceSelect.vue'
import RangeSetting from './RangeSetting.vue'
import SettingRow from './SettingRow.vue'
import SettingsGroup from './SettingsGroup.vue'

const sakura = useSakura()

const placementOptions = () => [
  { value: 'behind', label: t('settings.sakura.placement.behind'), help: t('settings.sakura.placement.behind.help') },
  { value: 'idle', label: t('settings.sakura.placement.idle'), help: t('settings.sakura.placement.idle.help') },
  { value: 'both', label: t('settings.sakura.placement.both'), help: t('settings.sakura.placement.both.help') },
  { value: 'over', label: t('settings.sakura.placement.over'), help: t('settings.sakura.placement.over.help') },
]

const spinnerOptions = () => [
  { value: 'spin', label: t('settings.sakura.spinnerStyle.spin'), help: t('settings.sakura.spinnerStyle.spin.help') },
  { value: 'blossom', label: t('settings.sakura.spinnerStyle.blossom'), help: t('settings.sakura.spinnerStyle.blossom.help') },
  { value: 'orbit', label: t('settings.sakura.spinnerStyle.orbit'), help: t('settings.sakura.spinnerStyle.orbit.help') },
  { value: 'breathe', label: t('settings.sakura.spinnerStyle.breathe'), help: t('settings.sakura.spinnerStyle.breathe.help') },
]

function setPlacement(value: string): void {
  if (isPetalPlacement(value)) sakura.setPlacement(value)
}

function setSpinnerStyle(value: string): void {
  if (isSpinnerStyle(value)) sakura.setSpinnerStyle(value)
}
</script>

<template>
  <SettingsGroup :title="t('settings.sakura.title')" scope="browser">
    <SettingRow :label="t('settings.sakura.font')" :help="t('settings.sakura.font.help')" label-for="set-sakura-font">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-sakura-font" :model-value="sakura.roundedFont.value" @update:model-value="(value) => sakura.setRoundedFont(value === true)" />
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.artwork')" :help="t('settings.sakura.artwork.help')" label-for="set-sakura-artwork">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-sakura-artwork" :model-value="sakura.artwork.value" @update:model-value="(value) => sakura.setArtwork(value === true)" />
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.artworkFirst')" :help="t('settings.artworkFirst.help')" label-for="set-sakura-artwork-first">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-sakura-artwork-first" :model-value="sakura.artworkFirst.value" :disabled="!sakura.artwork.value" @update:model-value="(value) => sakura.setArtworkFirst(value === true)" />
      </div>
    </SettingRow>
    <SettingRow :label="t('settings.sakura.petals')" :help="t('settings.sakura.petals.help')" label-for="set-sakura-petals">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-sakura-petals" :model-value="sakura.petals.value" @update:model-value="(value) => sakura.setPetals(value === true)" />
      </div>
    </SettingRow>
    <template v-if="sakura.petals.value">
      <SettingRow :label="t('settings.sakura.placement')" label-for="set-sakura-placement">
        <ChoiceSelect id="set-sakura-placement" :options="placementOptions()" :model-value="sakura.placement.value" @change="setPlacement" />
      </SettingRow>
      <RangeSetting :label="t('settings.sakura.count')" :help="t('settings.sakura.count.help')" :model-value="sakura.count.value" :default-value="DEFAULT_PETAL_COUNT" :min="4" :max="100" unit="" @update:model-value="sakura.setCount" />
      <RangeSetting :label="t('settings.sakura.speed')" :help="t('settings.sakura.speed.help')" :model-value="sakura.speed.value" :default-value="DEFAULT_PETAL_SPEED" :min="50" :max="250" unit="%" @update:model-value="sakura.setSpeed" />
    </template>
    <SettingRow :label="t('settings.sakura.shower')" :help="t('settings.sakura.shower.help')" label-for="set-sakura-shower">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-sakura-shower" :model-value="sakura.shower.value" @update:model-value="(value) => sakura.setShower(value === true)" />
      </div>
    </SettingRow>
    <template v-if="sakura.shower.value">
      <RangeSetting :label="t('settings.sakura.showerCount')" :help="t('settings.sakura.showerCount.help')" :model-value="sakura.showerCount.value" :default-value="DEFAULT_SHOWER_COUNT" :min="4" :max="100" unit="" @update:model-value="sakura.setShowerCount" />
      <RangeSetting :label="t('settings.sakura.showerSpeed')" :help="t('settings.sakura.showerSpeed.help')" :model-value="sakura.showerSpeed.value" :default-value="DEFAULT_SHOWER_SPEED" :min="50" :max="250" unit="%" @update:model-value="sakura.setShowerSpeed" />
    </template>
    <SettingRow :label="t('settings.sakura.spinner')" :help="t('settings.sakura.spinner.help')" label-for="set-sakura-spinner">
      <div class="flex items-center sm:justify-end">
        <Switch id="set-sakura-spinner" :model-value="sakura.spinner.value" @update:model-value="(value) => sakura.setSpinner(value === true)" />
      </div>
    </SettingRow>
    <SettingRow v-if="sakura.spinner.value" :label="t('settings.sakura.spinnerStyle')" :help="t('settings.sakura.spinnerStyle.help')" label-for="set-sakura-spinner-style">
      <ChoiceSelect id="set-sakura-spinner-style" :options="spinnerOptions()" :model-value="sakura.spinnerStyle.value" @change="setSpinnerStyle" />
    </SettingRow>
  </SettingsGroup>
</template>
