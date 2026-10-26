<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search } from '@lucide/vue'
import { server } from '@/app/server'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n'
import type { QuickPrompt, QuickPromptCatalog } from '@/protocol/types'

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ fill: [text: string] }>()

const catalog = ref<QuickPromptCatalog | null>(null)
const loading = ref(false)
const failed = ref(false)
const search = ref('')
const selected = ref<string | null>(null)
// The terminal picker opens on Fill every time, so the choice is not remembered.
const action = ref<'fill' | 'send'>('fill')
const busy = computed(() => server.model.turnActive)

watch(open, async (isOpen) => {
  if (!isOpen) return
  action.value = 'fill'
  search.value = ''
  selected.value = null
  loading.value = true
  failed.value = false
  // Each open reloads the directory, as the terminal does.
  const result = await server.loadQuickPrompts()
  catalog.value = result ?? null
  failed.value = result === undefined
  loading.value = false
  selected.value = firstUsable(result?.prompts ?? [])?.name ?? null
})

const firstUsable = (list: QuickPrompt[]) => list.find((prompt) => prompt.error === null) ?? list[0]

const matches = computed(() => {
  const needle = search.value.trim().toLowerCase()
  const list = catalog.value?.prompts ?? []
  if (needle === '') return list
  return list.filter((prompt) => prompt.name.toLowerCase().includes(needle) || prompt.text.toLowerCase().includes(needle))
})

// Keep the selection on a visible row while the search narrows the list.
watch(matches, (list) => {
  if (!list.some((prompt) => prompt.name === selected.value)) selected.value = firstUsable(list)?.name ?? null
})

const current = computed(() => matches.value.find((prompt) => prompt.name === selected.value) ?? null)
const canApply = computed(() => current.value !== null && current.value.error === null)

function move(step: 1 | -1): void {
  const list = matches.value
  if (list.length === 0) return
  const index = list.findIndex((prompt) => prompt.name === selected.value)
  selected.value = list[(index + step + list.length) % list.length]?.name ?? null
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault()
    action.value = action.value === 'fill' ? 'send' : 'fill'
  } else if (event.key === 'Enter') {
    event.preventDefault()
    void apply()
  }
}

async function apply(): Promise<void> {
  const prompt = current.value
  if (!prompt || prompt.error !== null) return
  open.value = false
  if (action.value === 'fill') emit('fill', prompt.text)
  else await server.sendQuickPrompt(prompt.name)
}

const applyLabel = computed(() =>
  action.value === 'fill' ? t('quick.apply.fill') : busy.value ? t('quick.apply.queued') : t('quick.apply.send'),
)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex max-h-[min(90dvh,40rem)] flex-col gap-3 p-4 sm:max-w-2xl sm:p-5"
      @keydown="onKeydown"
    >
      <DialogHeader>
        <DialogTitle>{{ t('quick.title') }}</DialogTitle>
        <DialogDescription>{{ t('quick.description') }}</DialogDescription>
      </DialogHeader>

      <div class="flex flex-wrap items-center gap-2">
        <div class="relative min-w-40 flex-1">
          <Search class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input v-model="search" class="pl-9" :placeholder="t('quick.search')" :aria-label="t('quick.search')" autocomplete="off" />
        </div>
        <div role="group" :aria-label="t('quick.action')" class="bg-muted inline-flex rounded-md p-0.5">
          <button
            v-for="choice in (['fill', 'send'] as const)"
            :key="choice"
            type="button"
            class="rounded px-3 py-1.5 text-sm font-medium transition-colors"
            :class="action === choice ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'"
            :aria-pressed="action === choice"
            @click="action = choice"
          >
            {{ choice === 'fill' ? t('quick.fill') : t('quick.send') }}
          </button>
        </div>
      </div>

      <p v-if="loading" class="text-muted-foreground py-6 text-center text-sm">{{ t('quick.loading') }}</p>
      <p v-else-if="failed" role="alert" class="text-destructive py-6 text-center text-sm">{{ t('quick.failed') }}</p>
      <template v-else-if="catalog">
        <p v-if="catalog.error" class="text-destructive text-sm">{{ catalog.error }}</p>
        <p v-if="catalog.prompts.length === 0" class="text-muted-foreground py-6 text-center text-sm">
          {{ t('quick.none', { directory: catalog.directory }) }}
        </p>
        <p v-else-if="matches.length === 0" class="text-muted-foreground py-6 text-center text-sm">{{ t('quick.noMatch') }}</p>
        <div v-else class="grid min-h-0 flex-1 grid-rows-[minmax(5rem,10rem)_minmax(6rem,1fr)] gap-3 sm:grid-cols-[14rem_1fr] sm:grid-rows-1">
          <ul role="listbox" :aria-label="t('quick.title')" class="min-h-0 space-y-0.5 overflow-y-auto rounded-md border p-1">
            <li
              v-for="prompt in matches"
              :key="prompt.name"
              role="option"
              :aria-selected="prompt.name === selected"
              :aria-disabled="prompt.error !== null"
              class="cursor-pointer rounded px-2.5 py-2 text-sm"
              :class="[
                prompt.name === selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                prompt.error !== null ? 'text-muted-foreground' : '',
              ]"
              @click="selected = prompt.name"
              @dblclick="apply"
            >
              <span class="block truncate">{{ prompt.name }}</span>
              <span v-if="prompt.error" class="block truncate text-xs">{{ t('quick.disabled', { reason: prompt.error }) }}</span>
            </li>
          </ul>
          <div class="min-h-0 overflow-y-auto rounded-md border p-3">
            <p v-if="!current" class="text-muted-foreground text-sm">{{ t('quick.pick') }}</p>
            <p v-else-if="current.error" class="text-destructive text-sm">{{ t('quick.disabled', { reason: current.error }) }}</p>
            <pre v-else class="font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">{{ current.text }}</pre>
          </div>
        </div>
      </template>

      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button :disabled="!canApply" @click="apply">{{ applyLabel }}</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
