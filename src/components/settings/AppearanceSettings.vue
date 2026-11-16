<script setup lang="ts">
import { t, useLocale, type Locale } from '@/i18n'
import { useTheme, type ThemeSetting } from '@/theme/theme'
import { useTitleSetting, type TitleSetting } from '@/composables/page-title'
import { useHeaderTitleSetting, type HeaderTitleSetting } from '@/composables/header-title'
import { useConversationWidth } from '@/composables/conversation-width'
import { useDisplayStyle } from '@/composables/display-style'
import { Switch } from '@/components/ui/switch'
import ChoiceSelect from './ChoiceSelect.vue'
import SettingRow from './SettingRow.vue'
import SettingsGroup from './SettingsGroup.vue'

const { locale, setLocale, locales } = useLocale()
const { theme, setTheme } = useTheme()
const { titleSetting, setTitleSetting } = useTitleSetting()
const { headerTitle, setHeaderTitle } = useHeaderTitleSetting()
const { fullWidth, setFullWidth } = useConversationWidth()
const { fadeIn, setFadeIn } = useDisplayStyle()

const localeOptions = locales.map((item) => ({ value: item.id, label: item.label, help: '' }))
const themeOptions = (): { value: string; label: string; help: string }[] => [
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
