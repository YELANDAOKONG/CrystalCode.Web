<script setup lang="ts">
import { Switch } from '@/components/ui/switch'
import { t, type MessageKey } from '@/i18n'
import { useLavender } from '@/theme/lavender'
import SettingRow from './SettingRow.vue'
import SettingsGroup from './SettingsGroup.vue'

const lavender = useLavender()
const choices = [
  { id: 'artwork', label: 'settings.artwork', help: 'settings.lavender.artwork.help', preference: lavender.artwork },
  { id: 'artwork-first', label: 'settings.artworkFirst', help: 'settings.artworkFirst.help', preference: lavender.artworkFirst },
  { id: 'particles', label: 'settings.lavender.particles', help: 'settings.lavender.particles.help', preference: lavender.particles },
  { id: 'shower', label: 'settings.lavender.shower', help: 'settings.lavender.shower.help', preference: lavender.shower },
  { id: 'spinner', label: 'settings.lavender.spinner', help: 'settings.lavender.spinner.help', preference: lavender.spinner },
] satisfies { id: string; label: MessageKey; help: MessageKey; preference: typeof lavender.artwork }[]
</script>

<template>
  <SettingsGroup :title="t('settings.palette.lavender')" scope="browser">
    <SettingRow v-for="item in choices" :key="item.id" :label="t(item.label)" :help="t(item.help)" :label-for="`set-lavender-${item.id}`">
      <div class="flex items-center sm:justify-end">
        <Switch
          :id="`set-lavender-${item.id}`"
          :model-value="item.preference.current.value"
          :disabled="item.id === 'artwork-first' && !lavender.artwork.current.value"
          @update:model-value="(value) => item.preference.set(value === true)"
        />
      </div>
    </SettingRow>
  </SettingsGroup>
</template>
