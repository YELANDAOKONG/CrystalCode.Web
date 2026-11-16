<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import { t } from '@/i18n'
import type { Option } from '@/session/settings'
import ChoiceSelect from './ChoiceSelect.vue'
import SettingRow from './SettingRow.vue'

// One server-side choice: a picker that locks for a read-only token, and for a
// non-admin one when `admin` is set, and that shows a change the server has
// deferred. The page shows the active value until the server reports a new one.
const props = defineProps<{
  id: string
  label: string
  help?: string
  options: Option[]
  current: string | undefined
  /** Text for a change that waits for the next turn. */
  pending?: string
  /** Shown when nothing is pending. */
  note?: string
  /** The server asks for admin to change this. */
  admin?: boolean
  disabled?: boolean
  loading?: boolean
  searchable?: boolean
}>()
const emit = defineEmits<{ change: [value: string] }>()

const { canOperate, isAdmin } = server
const adminLocked = computed(() => props.admin === true && !isAdmin.value)
const shownNote = computed(() => props.pending ?? props.note ?? (adminLocked.value && canOperate.value ? t('settings.adminOnly') : undefined))
</script>

<template>
  <SettingRow :label="label" :help="help" :note="shownNote" :label-for="id">
    <ChoiceSelect
      :id="id"
      :options="options"
      :model-value="current"
      :searchable="searchable"
      :disabled="!canOperate || adminLocked || disabled"
      :loading="loading"
      @change="(value) => emit('change', value)"
    />
  </SettingRow>
</template>
