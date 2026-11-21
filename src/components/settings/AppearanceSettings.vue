<script setup lang="ts">
import { t, useLocale, type Locale } from '@/i18n'
import { useTheme, type ThemeSetting, type ColorMode } from '@/theme/theme'
import { useTitleSetting, type TitleSetting } from '@/composables/page-title'
import { useHeaderTitleSetting, type HeaderTitleSetting } from '@/composables/header-title'
import { useConversationWidth } from '@/composables/conversation-width'
import { useDisplayStyle } from '@/composables/display-style'
import { Switch } from '@/components/ui/switch'
import { useAppearance, DEFAULT_PANEL_BLUR, DEFAULT_PANEL_OPACITY } from '@/theme/appearance'
import BackgroundEditor from './BackgroundEditor.vue'
import RangeSetting from './RangeSetting.vue'
import ChoiceSelect from './ChoiceSelect.vue'
import SettingRow from './SettingRow.vue'
import SettingsGroup from './SettingsGroup.vue'

const { locale, setLocale, locales } = useLocale()
const { theme, colorMode, setTheme, setColorMode } = useTheme()
const { titleSetting, setTitleSetting } = useTitleSetting()
const { headerTitle, setHeaderTitle } = useHeaderTitleSetting()
const { fullWidth, setFullWidth } = useConversationWidth()
const { fadeIn, setFadeIn } = useDisplayStyle()
const appearance = useAppearance()

const localeOptions = locales.map((item) => ({ value: item.id, label: item.label, help: '' }))
const themeOptions = () => [
  { value: 'default', label: t('settings.palette.default'), help: '', group: t('settings.palette.group.color') },
  { value: 'ocean', label: t('settings.palette.ocean'), help: '', group: t('settings.palette.group.color') },
  { value: 'forest', label: t('settings.palette.forest'), help: '', group: t('settings.palette.group.color') },
  { value: 'crystal-intelligence', label: t('settings.palette.crystalIntelligence'), help: '', group: t('settings.palette.group.product') },
  { value: 'frontier-intelligence', label: t('settings.palette.frontierIntelligence'), help: '', group: t('settings.palette.group.product') },
]
const colorModeOptions = () => [
  { value: 'auto', label: t('common.theme.auto'), help: '' },
  { value: 'light', label: t('common.theme.light'), help: '' },
  { value: 'dark', label: t('common.theme.dark'), help: '' },
]


</script>

<template>
  <div class="space-y-8">
    <SettingsGroup :title="t('settings.group.look')" scope="browser">
      <SettingRow :label="t('settings.language')" label-for="set-language">
        <ChoiceSelect id="set-language" :options="localeOptions" :model-value="locale" @change="(v) => setLocale(v as Locale)" />
      </SettingRow>
      <SettingRow :label="t('settings.theme')" label-for="set-theme">
        <ChoiceSelect id="set-theme" :options="themeOptions()" :model-value="theme" @change="(v) => setTheme(v as ThemeSetting)" />
      </SettingRow>
      <SettingRow :label="t('settings.colorMode')" label-for="set-color-mode">
        <ChoiceSelect id="set-color-mode" :options="colorModeOptions()" :model-value="colorMode" @change="(v) => setColorMode(v as ColorMode)" />
      </SettingRow>
      <SettingRow v-if="appearance.hasSavedImage.value" :label="t('settings.background.enabled')" :help="t('settings.background.enabled.help')" label-for="set-background-enabled">
        <div class="flex items-center sm:justify-end">
          <Switch id="set-background-enabled" :model-value="appearance.enabled.value" @update:model-value="(value) => appearance.setEnabled(value === true)" />
        </div>
      </SettingRow>
      <SettingRow :label="t('settings.background.separate')" :help="t('settings.background.separate.help')" label-for="set-background-separate">
        <div class="flex items-center sm:justify-end">
          <Switch id="set-background-separate" :model-value="appearance.separate.value" @update:model-value="(value) => appearance.setSeparate(value === true)" />
        </div>
      </SettingRow>
      <BackgroundEditor v-if="!appearance.separate.value" which="shared" />
      <template v-else>
        <BackgroundEditor which="light" />
        <BackgroundEditor which="dark" />
      </template>
      <template v-if="appearance.hasBackground.value">
        <RangeSetting :label="t('settings.panelOpacity')" :help="t('settings.panelOpacity.help')" :model-value="appearance.opacity.value" :default-value="DEFAULT_PANEL_OPACITY" :min="50" :max="95" unit="%" @update:model-value="appearance.setOpacity" />
        <RangeSetting :label="t('settings.panelBlur')" :help="t('settings.panelBlur.help')" :model-value="appearance.panelBlur.value" :default-value="DEFAULT_PANEL_BLUR" :min="0" :max="32" unit="px" @update:model-value="appearance.setPanelBlur" />
      </template>
      <SettingRow :label="t('settings.conversationWidth')" :help="t('settings.conversationWidth.help')" label-for="set-conversation-width">
        <div class="flex items-center sm:justify-end">
          <Switch id="set-conversation-width" :model-value="fullWidth" @update:model-value="(value) => setFullWidth(value === true)" />
        </div>
      </SettingRow>
      <SettingRow :label="t('settings.fadeIn')" :help="t('settings.fadeIn.help')" label-for="set-fade-in">
        <div class="flex items-center sm:justify-end">
          <Switch id="set-fade-in" :model-value="fadeIn" @update:model-value="(value) => setFadeIn(value === true)" />
        </div>
      </SettingRow>
    </SettingsGroup>

    <SettingsGroup :title="t('settings.group.titles')" scope="browser">
      <SettingRow :label="t('settings.pageTitle')" :help="t('settings.title.help')" label-for="set-title">
        <ChoiceSelect
          id="set-title"
          :options="[
            { value: 'session', label: t('settings.title.session'), help: '' },
            { value: 'fixed', label: t('settings.title.fixed'), help: '' },
          ]"
          :model-value="titleSetting"
          @change="(v) => setTitleSetting(v as TitleSetting)"
        />
      </SettingRow>
      <SettingRow :label="t('settings.headerTitle')" :help="t('settings.headerTitle.help')" label-for="set-header">
        <ChoiceSelect
          id="set-header"
          :options="[
            { value: 'topic', label: t('settings.headerTitle.topic'), help: '' },
            { value: 'workspace', label: t('settings.headerTitle.workspace'), help: '' },
          ]"
          :model-value="headerTitle"
          @change="(v) => setHeaderTitle(v as HeaderTitleSetting)"
        />
      </SettingRow>
    </SettingsGroup>
  </div>
</template>
