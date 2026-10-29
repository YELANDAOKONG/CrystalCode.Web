<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Check, ChevronDown } from '@lucide/vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { t } from '@/i18n'
import type { Option } from '@/session/settings'

// A choice with hundreds of entries, such as every model in the catalog. A
// Select mounts every entry even while closed, which froze the page for
// seconds. This one mounts nothing until it opens, shows a bounded slice of the
// matches, and narrows them as the operator types.
const props = defineProps<{
  id: string
  options: Option[]
  modelValue: string | undefined
  disabled?: boolean
  loading?: boolean
}>()
const emit = defineEmits<{ change: [value: string] }>()

const SHOWN = 80

const open = ref(false)
const query = ref('')
const search = ref<HTMLInputElement | null>(null)

const label = computed(() => props.options.find((option) => option.value === props.modelValue)?.label ?? props.modelValue ?? '')

// Group headings and entries in one flat list, so the slice below counts rows.
type Row = { kind: 'group'; name: string } | { kind: 'item'; option: Option }
const matches = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (needle === '') return props.options
  return props.options.filter((option) => `${option.group ?? ''} ${option.label}`.toLowerCase().includes(needle))
})
const rows = computed<Row[]>(() => {
  const result: Row[] = []
  let group: string | null = null
  for (const option of matches.value.slice(0, SHOWN)) {
    const name = option.group ?? null
    if (name !== group && name) result.push({ kind: 'group', name })
    group = name
    result.push({ kind: 'item', option })
  }

  return result
})
const hidden = computed(() => Math.max(0, matches.value.length - SHOWN))

function pick(option: Option): void {
  open.value = false
  if (option.value !== props.modelValue) emit('change', option.value)
}

watch(open, (now) => {
  query.value = ''
  if (now) void nextTick(() => search.value?.focus())
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        :id="id"
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="open"
        :aria-busy="loading || undefined"
        :disabled="disabled || loading || options.length === 0"
        class="border-input bg-field hover:bg-field-hover focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm shadow-xs outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9"
      >
        <span class="line-clamp-1">{{ label }}</span>
        <Spinner v-if="loading" class="text-muted-foreground size-4 shrink-0 motion-reduce:animate-none" />
        <ChevronDown v-else class="size-4 shrink-0 opacity-50" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" class="w-(--reka-popover-trigger-width) min-w-64 p-0">
      <input
        ref="search"
        v-model="query"
        type="text"
        inputmode="search"
        autocomplete="off"
        :placeholder="t('choice.search')"
        :aria-label="t('choice.search')"
        class="placeholder:text-muted-foreground h-10 w-full border-b bg-transparent px-3 text-sm outline-none"
      />
      <ul role="listbox" class="max-h-72 overflow-y-auto p-1">
        <template v-for="(row, index) in rows" :key="index">
          <li v-if="row.kind === 'group'" role="presentation" class="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium">{{ row.name }}</li>
          <li
            v-else
            role="option"
            tabindex="-1"
            :aria-selected="row.option.value === modelValue"
            class="hover:bg-accent hover:text-accent-foreground flex min-h-9 cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-2 text-sm"
            @click="pick(row.option)"
            @keydown.enter.prevent="pick(row.option)"
          >
            <span class="min-w-0 flex-1 break-all">{{ row.option.label }}</span>
            <Check v-if="row.option.value === modelValue" class="size-4 shrink-0" />
          </li>
        </template>
        <li v-if="matches.length === 0" class="text-muted-foreground px-2 py-6 text-center text-sm">{{ t('choice.none') }}</li>
        <li v-else-if="hidden > 0" class="text-muted-foreground px-2 py-2 text-center text-xs">{{ t('choice.more', { count: hidden }) }}</li>
      </ul>
    </PopoverContent>
  </Popover>
</template>
