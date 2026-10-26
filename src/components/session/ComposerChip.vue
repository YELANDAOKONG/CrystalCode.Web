<script setup lang="ts">
import type { Component } from 'vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { t } from '@/i18n'
import type { Option } from '@/session/settings'

// A composer control: a fixed icon for what it sets, then the current value.
// On a phone only the icon stays, so three of them still fit beside the send
// button. The value is in the accessible name either way.
const props = defineProps<{
  icon: Component
  name: string
  value: string
  options: Option[]
  current: string | undefined
  disabled?: boolean
  note?: string
}>()
const emit = defineEmits<{ pick: [value: string] }>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="sm"
        class="h-10 gap-1.5 px-2.5 text-xs md:h-8"
        :disabled="disabled"
        :title="t('chip.change', { name, value })"
        :aria-label="t('chip.change', { name, value })"
      >
        <component :is="icon" class="size-4 shrink-0" aria-hidden="true" />
        <span class="hidden sm:inline">{{ value }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" side="top" class="min-w-44">
      <DropdownMenuLabel>{{ props.name }}</DropdownMenuLabel>
      <p v-if="note" class="text-muted-foreground px-2 pb-1.5 text-xs">{{ note }}</p>
      <DropdownMenuRadioGroup :model-value="current" @update:model-value="(v) => emit('pick', String(v))">
        <DropdownMenuRadioItem v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <p v-if="options.length === 0" class="text-muted-foreground px-2 py-1.5 text-xs">{{ t('chip.noOptions') }}</p>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
