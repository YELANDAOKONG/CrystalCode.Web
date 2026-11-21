<script setup lang="ts">
import { RotateCcw } from '@lucide/vue'
import { t } from '@/i18n'
import { Button } from '@/components/ui/button'
import SettingRow from './SettingRow.vue'

const props = defineProps<{
  label: string
  help?: string
  modelValue: number
  defaultValue: number
  min: number
  max: number
  unit: string
  /** Names the slider when the visible label alone is ambiguous. */
  ariaLabel?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<template>
  <SettingRow :label="label" :help="help">
    <div class="flex items-center gap-2">
      <input type="range" class="accent-primary w-full" :value="modelValue" :min="min" :max="max" step="1" :aria-label="ariaLabel ?? label" @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))">
      <output class="w-12 shrink-0 text-right text-xs tabular-nums">{{ modelValue }}{{ unit }}</output>
      <Button type="button" variant="ghost" size="icon" class="size-8 shrink-0" :disabled="modelValue === props.defaultValue" :aria-label="`${ariaLabel ?? label}: ${t('settings.resetToDefault')}`" :title="t('settings.resetToDefault')" @click="emit('update:modelValue', props.defaultValue)"><RotateCcw class="size-4" /></Button>
    </div>
  </SettingRow>
</template>
