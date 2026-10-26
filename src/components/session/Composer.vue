<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowUp, ImagePlus, Square, Undo2, Zap } from '@lucide/vue'
import { server } from '@/app/server'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { t } from '@/i18n'
import type { QuickPromptCatalog } from '@/protocol/types'

const model = server.model
const { canOperate } = server

const text = ref('')
const field = ref<InstanceType<typeof Textarea> | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const composing = ref(false)
const sending = ref(false)
const choice = ref(0)
const historyIndex = ref<number | null>(null)

const busy = computed(() => model.turnActive)
const blocked = computed(() => !canOperate.value)

// --- slash command suggestions ------------------------------------------

const suggestions = computed(() => {
  const value = text.value
  if (!value.startsWith('/') || /\s/.test(value)) return []
  const prefix = value.slice(1).toLowerCase()
  return model.commands.filter((command) => command.name.toLowerCase().startsWith(prefix)).slice(0, 8)
})

watch(suggestions, () => {
  choice.value = 0
})

function complete(name: string): void {
  text.value = `/${name} `
  void nextTick(() => element()?.focus())
}

// --- sending --------------------------------------------------------------

async function submit(): Promise<void> {
  const value = text.value
  if (sending.value || blocked.value || value.trim() === '') return
  sending.value = true
  try {
    const result = await server.send(value)
    if (result) {
      text.value = ''
      historyIndex.value = null
    }
  } finally {
    sending.value = false
  }
}

function element(): HTMLTextAreaElement | null {
  const root = field.value?.$el as HTMLElement | undefined
  return root instanceof HTMLTextAreaElement ? root : (root?.querySelector('textarea') ?? null)
}

function onKeydown(event: KeyboardEvent): void {
  if (composing.value || event.isComposing) return
  const area = event.target as HTMLTextAreaElement

  if (suggestions.value.length > 0) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const count = suggestions.value.length
      choice.value = (choice.value + (event.key === 'ArrowDown' ? 1 : count - 1)) % count
      return
    }

    if (event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey && text.value !== `/${suggestions.value[choice.value]?.name}`)) {
      event.preventDefault()
      const picked = suggestions.value[choice.value]
      if (picked) complete(picked.name)
      return
    }
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void submit()
    return
  }

  // Walk the prompt history from the first or last line, as a terminal would.
  if (event.key === 'ArrowUp' && area.selectionStart === 0 && area.selectionEnd === 0) {
    const history = model.promptHistory
    if (history.length === 0) return
    const next = historyIndex.value === null ? history.length - 1 : Math.max(0, historyIndex.value - 1)
    event.preventDefault()
    historyIndex.value = next
    text.value = history[next] ?? ''
  } else if (event.key === 'ArrowDown' && historyIndex.value !== null && area.selectionStart === text.value.length) {
    event.preventDefault()
    const next = historyIndex.value + 1
    if (next >= model.promptHistory.length) {
      historyIndex.value = null
      text.value = ''
    } else {
      historyIndex.value = next
      text.value = model.promptHistory[next] ?? ''
    }
  } else if (event.key === 'Escape' && busy.value) {
    void server.interrupt()
  }
}

// --- draft sync and recall -----------------------------------------------

let draftTimer: ReturnType<typeof setTimeout> | undefined
watch(text, (value) => {
  clearTimeout(draftTimer)
  draftTimer = setTimeout(() => void server.syncDraft(value), 400)
})

watch(
  () => model.recalledDraft,
  (recalled) => {
    if (!recalled) return
    text.value = recalled.text
    void nextTick(() => element()?.focus())
  },
)

// --- images ----------------------------------------------------------------

const canAttach = computed(() => canOperate.value && server.can('POST /images'))

async function attach(blob: Blob): Promise<void> {
  const uploaded = await server.uploadImage(blob)
  if (!uploaded) return
  const area = element()
  const marker = uploaded.trustedMarker || uploaded.marker
  const at = area?.selectionStart ?? text.value.length
  text.value = `${text.value.slice(0, at)}${marker}${text.value.slice(at)}`
}

function onPaste(event: ClipboardEvent): void {
  if (!canAttach.value) return
  const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith('image/'))
  if (files.length === 0) return
  event.preventDefault()
  for (const file of files) void attach(file)
}

function onDrop(event: DragEvent): void {
  if (!canAttach.value) return
  const files = [...(event.dataTransfer?.files ?? [])].filter((file) => file.type.startsWith('image/'))
  if (files.length === 0) return
  event.preventDefault()
  for (const file of files) void attach(file)
}

function onPick(event: Event): void {
  const input = event.target as HTMLInputElement
  for (const file of input.files ?? []) void attach(file)
  input.value = ''
}

// --- quick prompts and mode ------------------------------------------------

const quick = ref<QuickPromptCatalog | null>(null)
const quickLoading = ref(false)

async function loadQuick(open: boolean): Promise<void> {
  if (!open) return
  quickLoading.value = true
  quick.value = (await server.loadQuickPrompts()) ?? null
  quickLoading.value = false
}

const canQuick = computed(() => canOperate.value && server.can('GET /quick-prompts'))
const mode = computed(() => model.chrome?.mode ?? '')
</script>

<template>
  <div class="bg-background border-t px-4 pt-3 pb-4" @dragover.prevent @drop="onDrop">
    <div class="relative mx-auto max-w-3xl">
      <ul
        v-if="suggestions.length"
        role="listbox"
        :aria-label="t('composer.commands')"
        class="bg-popover text-popover-foreground absolute right-0 bottom-full left-0 z-10 mb-2 max-h-64 overflow-auto rounded-lg border p-1 shadow-md"
      >
        <li
          v-for="(command, index) in suggestions"
          :key="command.name"
          role="option"
          :aria-selected="index === choice"
          class="flex cursor-pointer items-baseline gap-3 rounded-md px-3 py-1.5 text-sm"
          :class="index === choice ? 'bg-accent text-accent-foreground' : ''"
          @mousedown.prevent="complete(command.name)"
        >
          <span class="font-mono">/{{ command.name }}</span>
          <span class="text-muted-foreground truncate text-xs">{{ command.help }}</span>
        </li>
      </ul>

      <p v-if="blocked" class="text-muted-foreground mb-2 text-sm">{{ t('composer.readonly') }}</p>

      <div class="bg-card focus-within:ring-ring rounded-xl border focus-within:ring-2">
        <Textarea
          ref="field"
          v-model="text"
          rows="2"
          :disabled="blocked"
          :placeholder="busy ? t('composer.placeholder.busy') : t('composer.placeholder')"
          :aria-label="t('composer.placeholder')"
          class="max-h-60 min-h-[3.5rem] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          @keydown="onKeydown"
          @paste="onPaste"
          @compositionstart="composing = true"
          @compositionend="composing = false"
        />
        <div class="flex items-center gap-1 px-2 pb-2">
          <Button
            v-if="mode"
            variant="ghost"
            size="sm"
            class="font-mono text-xs"
            :disabled="blocked"
            :title="t('composer.mode', { mode })"
            :aria-label="t('composer.mode', { mode })"
            @click="server.setMode('cycle')"
          >
            {{ mode }}
          </Button>

          <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onPick" />
          <Button
            v-if="canAttach"
            variant="ghost"
            size="icon"
            class="size-8"
            :title="t('composer.attach')"
            :aria-label="t('composer.attach')"
            @click="fileInput?.click()"
          >
            <ImagePlus class="size-4" />
          </Button>

          <DropdownMenu v-if="canQuick" @update:open="loadQuick">
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" class="size-8" :title="t('composer.quick')" :aria-label="t('composer.quick')">
                <Zap class="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="w-64">
              <DropdownMenuLabel>{{ t('composer.quick') }}</DropdownMenuLabel>
              <DropdownMenuItem v-if="quickLoading" disabled>{{ t('composer.quick.loading') }}</DropdownMenuItem>
              <template v-else-if="quick">
                <DropdownMenuItem v-if="quick.error" disabled class="text-destructive">{{ quick.error }}</DropdownMenuItem>
                <DropdownMenuItem v-else-if="quick.prompts.length === 0" disabled>
                  {{ t('composer.quick.empty', { directory: quick.directory }) }}
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-for="prompt in quick.prompts"
                  :key="prompt.name"
                  :disabled="prompt.error !== null"
                  @select="server.sendQuickPrompt(prompt.name)"
                >
                  <span class="truncate">{{ prompt.name }}</span>
                </DropdownMenuItem>
              </template>
            </DropdownMenuContent>
          </DropdownMenu>

          <span class="flex-1" />

          <Button
            v-if="model.queue.length"
            variant="ghost"
            size="sm"
            :disabled="blocked"
            :title="t('composer.recall')"
            @click="server.recall()"
          >
            <Undo2 class="size-4" />
            {{ t('composer.queued', { count: model.queue.length }) }}
          </Button>
          <Button v-if="busy" variant="outline" size="sm" :disabled="blocked" @click="server.interrupt()">
            <Square class="size-3.5" />
            {{ t('composer.stop') }}
          </Button>
          <Button size="icon" class="size-8" :disabled="blocked || sending || text.trim() === ''" :aria-label="t('composer.send')" @click="submit">
            <ArrowUp class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
