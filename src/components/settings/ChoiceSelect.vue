<script setup lang="ts">
import { computed } from 'vue'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import LongChoice from './LongChoice.vue'
import type { Option } from '@/session/settings'

const props = defineProps<{
  id: string
  options: Option[]
  modelValue: string | undefined
  disabled?: boolean
  /** A change is on its way. The control keeps its value, shows a spinner, and ignores input. */
  loading?: boolean
  placeholder?: string
}>()
const emit = defineEmits<{ change: [value: string] }>()

// An option the server did not list (for example a value set elsewhere) still
// shows as selected instead of leaving the control blank.
const value = computed(() => props.modelValue)

// A Select mounts every entry even while closed, so a catalog with hundreds of
// models froze the page. Long lists use a control that mounts on demand.
const LONG = 40
const long = computed(() => props.options.length > LONG)

// Entries without a group come first, then one labelled group per provider.
const groups = computed(() => {
  const result: { name: string | null; items: Option[] }[] = []
  for (const option of props.options) {
    const name = option.group ?? null
    const last = result[result.length - 1]
    if (last && last.name === name) last.items.push(option)
    else result.push({ name, items: [option] })
  }

  return result
})
</script>

<template>
  <LongChoice v-if="long" :id="id" :options="options" :model-value="modelValue" :disabled="disabled" :loading="loading" @change="(v) => emit('change', v)" />
  <Select v-else :model-value="value" :disabled="disabled || loading || options.length === 0" @update:model-value="(v) => emit('change', String(v))">
    <SelectTrigger :id="id" class="h-10 w-full sm:h-9 [&>svg:last-child]:data-[loading=true]:hidden" :data-loading="loading" :aria-busy="loading || undefined">
      <SelectValue :placeholder="placeholder" />
      <Spinner v-if="loading" class="text-muted-foreground size-4 shrink-0 motion-reduce:animate-none" />
    </SelectTrigger>
    <SelectContent>
      <template v-for="group in groups" :key="group.name ?? ''">
        <SelectGroup v-if="group.name">
          <SelectLabel>{{ group.name }}</SelectLabel>
          <SelectItem v-for="option in group.items" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
        </SelectGroup>
        <SelectItem v-for="option in group.name ? [] : group.items" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
      </template>
    </SelectContent>
  </Select>
</template>
