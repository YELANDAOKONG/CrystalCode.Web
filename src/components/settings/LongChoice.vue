<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Check, ChevronDown } from '@lucide/vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { t } from '@/i18n'
import type { Option } from '@/session/settings'

// A choice with hundreds of entries, such as every model in the catalog. A
// Select mounts every entry even while closed, which froze the page for
// seconds. This one mounts nothing until it opens and lets the operator search
// or scroll through every matching option.
const props = defineProps<{
  id: string
  options: Option[]
  modelValue: string | undefined
  disabled?: boolean
  loading?: boolean
}>()
const emit = defineEmits<{ change: [value: string] }>()

const open = ref(false)
const query = ref('')
const search = ref<HTMLInputElement | null>(null)
const list = ref<HTMLUListElement | null>(null)
// The highlighted entry while the search box keeps focus.
const active = ref(0)

const selected = computed(() => props.options.find((option) => option.value === props.modelValue))
const label = computed(() => selected.value?.label ?? props.modelValue ?? '')
// The provider goes on its own line, so a long model name keeps its room.
const provider = computed(() => selected.value?.group ?? '')

// Group headings and entries in one flat list.
type Row = { kind: 'group'; name: string } | { kind: 'item'; option: Option; index: number }
const matches = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (needle === '') return props.options
  return props.options.filter((option) => `${option.group ?? ''} ${option.label}`.toLowerCase().includes(needle))
})
const rows = computed<Row[]>(() => {
  const result: Row[] = []
  let group: string | null = null
  for (const [index, option] of matches.value.entries()) {
    const name = option.group ?? null
    if (name !== group && name) result.push({ kind: 'group', name })
    group = name
    result.push({ kind: 'item', option, index })
  }

  return result
})

function pick(option: Option): void {
  open.value = false
  if (option.value !== props.modelValue) emit('change', option.value)
}

const optionId = (index: number) => `${props.id}-option-${index}`
const activeId = computed(() => (matches.value.length > 0 ? optionId(active.value) : undefined))

function move(step: number): void {
  const count = matches.value.length
  if (count === 0) return
  active.value = (active.value + step + count) % count
  void nextTick(() => list.value?.querySelector(`#${CSS.escape(optionId(active.value))}`)?.scrollIntoView({ block: 'nearest' }))
}

function jump(index: number): void {
  active.value = index
  move(0)
}

function confirm(): void {
  const option = matches.value[active.value]
  if (option) pick(option)
}

watch(query, () => (active.value = 0))
watch(open, (now) => {
  query.value = ''
  if (now) {
    active.value = Math.max(0, props.options.findIndex((option) => option.value === props.modelValue))
    void nextTick(() => {
      search.value?.focus()
      move(0)
    })
  }
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
        :title="provider ? `${provider} / ${label}` : label"
        class="border-input bg-field hover:bg-field-hover focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-10 w-full items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-left text-sm shadow-xs outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9"
      >
        <span class="min-w-0 flex-1">
          <span v-if="provider" class="text-muted-foreground block truncate text-xs leading-4">{{ provider }}</span>
          <span class="block leading-5 break-all">{{ label }}</span>
        </span>
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
        :placeholder="`${t('choice.search')}…`"
        :aria-label="t('choice.search')"
        role="combobox"
        aria-expanded="true"
        aria-autocomplete="list"
        :aria-controls="`${id}-listbox`"
        :aria-activedescendant="activeId"
        class="placeholder:text-muted-foreground focus-visible:ring-ring/50 h-10 w-full border-b bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.home.prevent="jump(0)"
        @keydown.end.prevent="jump(matches.length - 1)"
        @keydown.enter.prevent="confirm"
      />
      <ul :id="`${id}-listbox`" ref="list" role="listbox" class="max-h-72 overflow-y-auto overscroll-contain p-1">
        <template v-for="(row, index) in rows" :key="index">
          <li v-if="row.kind === 'group'" role="presentation" class="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium">{{ row.name }}</li>
          <li
            v-else
            :id="optionId(row.index)"
            role="option"
            :aria-selected="row.option.value === modelValue"
            :class="['hover:bg-accent hover:text-accent-foreground flex min-h-9 cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-2 text-sm', row.index === active && 'bg-accent text-accent-foreground']"
            @click="pick(row.option)"
            @mousemove="active = row.index"
          >
            <span class="min-w-0 flex-1 break-all">{{ row.option.label }}</span>
            <Check v-if="row.option.value === modelValue" class="size-4 shrink-0" aria-hidden="true" />
          </li>
        </template>
        <li v-if="matches.length === 0" class="text-muted-foreground px-2 py-6 text-center text-sm">{{ t('choice.none') }}</li>
      </ul>
    </PopoverContent>
  </Popover>
</template>
