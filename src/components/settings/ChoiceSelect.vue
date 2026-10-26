<script setup lang="ts">
import { computed } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Option } from '@/session/settings'

const props = defineProps<{
  id: string
  options: Option[]
  modelValue: string | undefined
  disabled?: boolean
  placeholder?: string
}>()
const emit = defineEmits<{ change: [value: string] }>()

// An option the server did not list (for example a value set elsewhere) still
// shows as selected instead of leaving the control blank.
const value = computed(() => props.modelValue)
</script>

<template>
  <Select :model-value="value" :disabled="disabled || options.length === 0" @update:model-value="(v) => emit('change', String(v))">
    <SelectTrigger :id="id" class="h-10 w-full sm:h-9">
      <SelectValue :placeholder="placeholder" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
    </SelectContent>
  </Select>
</template>
