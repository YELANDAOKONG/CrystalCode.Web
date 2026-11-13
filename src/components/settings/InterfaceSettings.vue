<script setup lang="ts">
import { t } from '@/i18n'
import { useLocale, type Locale } from '@/i18n'
import { useTheme, type ThemeSetting } from '@/theme/theme'
import { useTitleSetting, type TitleSetting } from '@/composables/page-title'
import ChoiceSelect from './ChoiceSelect.vue'
import SettingRow from './SettingRow.vue'

const { locale, setLocale, locales } = useLocale()
const { theme, setTheme } = useTheme()
const { titleSetting, setTitleSetting } = useTitleSetting()

const localeOptions = locales.map((item) => ({ value: item.id, label: item.label, help: '' }))
const themeOptions = (): { value: string; label: string; help: string }[] => [
  { value: 'auto', label: t('common.theme.auto'), help: '' },
  { value: 'light', label: t('common.theme.light'), help: '' },
  { value: 'dark', label: t('common.theme.dark'), help: '' },
]
</script>

<template>
  <div class="divide-y">
    <p class="text-muted-foreground pb-3 text-xs">{{ t('settings.interface.help') }}</p>
    <SettingRow :label="t('settings.language')" label-for="set-language">
      <ChoiceSelect id="set-language" :options="localeOptions" :model-value="locale" @change="(v) => setLocale(v as Locale)" />
    </SettingRow>
    <SettingRow :label="t('settings.theme')" label-for="set-theme">
      <ChoiceSelect id="set-theme" :options="themeOptions()" :model-value="theme" @change="(v) => setTheme(v as ThemeSetting)" />
    </SettingRow>
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
  </div>
</template>
