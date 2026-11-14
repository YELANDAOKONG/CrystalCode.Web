<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { Spinner } from '@/components/ui/spinner'
import { useBusy } from '@/composables/busy'
import { ArrowUp, Brain, ImagePlus, Layers, Maximize2, ShieldCheck, Square, Zap } from '@lucide/vue'
import { server } from '@/app/server'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { t } from '@/i18n'
import { displayToken } from '@/session/display-case'
import { modeLabel } from '@/session/mode'
import { approvalModes, currentByLabel, findArguments, modeChoices, toOptions } from '@/session/settings'
import { sizeState } from '@/session/draft-size'
import { promptHistory, rememberPrompt } from '@/session/prompt-history'
import { aliasesOf, completedText, createPicker, isExact } from '@/session/slash'
import ComposerChip from './ComposerChip.vue'
import FullscreenComposer from './FullscreenComposer.vue'
import QuickPromptPicker from './QuickPromptPicker.vue'

const model = server.model
const { canOperate, isAdmin } = server

const text = ref('')
const field = ref<InstanceType<typeof Textarea> | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const composing = ref(false)
const fullOpen = ref(false)
const choice = ref(0)
const historyIndex = ref<number | null>(null)
const savedDraft = ref('')
const remembered = ref<string[]>([])
// True while the box is being filled from history, so that fill is not an edit.
let fromHistory = false

const prompts = computed(() => promptHistory(model.promptHistory, remembered.value))
const busy = computed(() => model.turnActive || model.activity === 'compacting')
const blocked = computed(() => !canOperate.value)

// --- slash command suggestions ------------------------------------------

// Commands, their aliases, and their arguments, three levels deep, from the
// server's own list. A picker is only offered while the draft is one line.
// A recalled slash command stays text until it is edited, as in the terminal.
const picker = computed(() => (historyIndex.value === null ? createPicker(text.value, model.commands) : null))
const suggestions = computed(() => picker.value?.matches ?? [])
const options = useTemplateRef<HTMLLIElement[]>('options')

watch(picker, () => {
  choice.value = 0
})

watch(choice, () => {
  void nextTick(() => options.value?.[choice.value]?.scrollIntoView({ block: 'nearest' }))
})

function complete(index: number): void {
  const current = picker.value
  const picked = current?.matches[index]
  if (!current || !picked) return
  text.value = completedText(current, picked)
  void nextTick(() => {
    const target = element()
    target?.focus()
    target?.setSelectionRange(text.value.length, text.value.length)
  })
}

// Enter completes the highlighted entry until the text already is that entry.
const needsCompletion = () => {
  const current = picker.value
  const picked = current?.matches[choice.value]
  return !!current && !!picked && !isExact(current, picked, text.value)
}

// --- sending --------------------------------------------------------------

const { busy: acting, run: track } = useBusy()
const awaiting = ref(false)
const sending = computed(() => awaiting.value && !busy.value)
const stop = () => void track('stop', () => server.interrupt())
let latestSend = 0

async function submit(): Promise<void> {
  const value = text.value
  if (blocked.value || sizeState(value) === 'over') return
  // Empty text does not enqueue. While something is queued it interrupts, so
  // the queue is sent now. The same key starts a prompt when the box has text.
  if (value.trim() === '') {
    if (busy.value && model.queue.length > 0) void server.send('')
    return
  }

  // Do not wait on this request. The server accepts a follow-up while an
  // earlier POST /input is still open, and a lock here dropped that follow-up.
  text.value = ''
  historyIndex.value = null
  remembered.value = rememberPrompt(remembered.value, value)
  const ticket = ++latestSend
  if (!busy.value) awaiting.value = true
  const result = await server.send(value)
  if (ticket === latestSend) awaiting.value = false
  // A refused input (the reason arrives as an error notice) keeps its text.
  if (ticket === latestSend && (!result || !result.accepted) && text.value === '') text.value = value
}

function element(): HTMLTextAreaElement | null {
  const root = field.value?.$el as HTMLElement | undefined
  return root instanceof HTMLTextAreaElement ? root : (root?.querySelector('textarea') ?? null)
}

function showHistory(index: number | null, value: string, cursor: 'start' | 'end'): void {
  // The text watch is not synchronous. Leave the flag set until it runs, or a
  // history fill is treated as an edit and the walk stops.
  fromHistory = true
  historyIndex.value = index
  if (text.value === value) fromHistory = false
  else text.value = value
  void nextTick(() => {
    const target = element()
    const at = cursor === 'start' ? 0 : target?.value.length ?? value.length
    target?.setSelectionRange(at, at)
  })
}

function onFirstLine(area: HTMLTextAreaElement): boolean {
  return !area.value.slice(0, area.selectionStart).includes('\n')
}

function onLastLine(area: HTMLTextAreaElement): boolean {
  return !area.value.slice(area.selectionEnd).includes('\n')
}

// Ctrl+C matches the terminal where the server allows it. A selection still
// copies. One queued item cannot be popped: the wire has no retract.
function onCancel(): void {
  if (blocked.value) return
  const empty = text.value.length === 0
  if (empty && model.queue.length > 0) return
  if (empty && busy.value) {
    void recallOrStop()
    return
  }

  if (busy.value) {
    void server.interrupt()
    return
  }

  if (!empty) showHistory(null, '', 'start')
}

async function recallOrStop(): Promise<void> {
  const recalled = await server.recall()
  if (recalled) return
  if (text.value.length === 0 && model.queue.length === 0 && busy.value) void server.interrupt()
}

function onKeydown(event: KeyboardEvent): void {
  if (composing.value || event.isComposing) return
  const area = event.target as HTMLTextAreaElement

  if (event.ctrlKey && !event.metaKey && !event.altKey && event.code === 'KeyC') {
    if (area.selectionStart !== area.selectionEnd) return
    event.preventDefault()
    onCancel()
    return
  }

  if (suggestions.value.length > 0) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const count = suggestions.value.length
      choice.value = (choice.value + (event.key === 'ArrowDown' ? 1 : count - 1)) % count
      return
    }

    if ((event.key === 'Tab' && !event.shiftKey) || (event.key === 'Enter' && !event.shiftKey && needsCompletion())) {
      event.preventDefault()
      complete(choice.value)
      return
    }
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void submit()
    return
  }

  // Up on the first line and Down on the last line walk history. The cursor
  // does not have to be at column 0; that is how the terminal moves.
  const plainArrow = !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey
  if (plainArrow && event.key === 'ArrowUp' && onFirstLine(area) && prompts.value.length > 0) {
    event.preventDefault()
    if (historyIndex.value === null) savedDraft.value = text.value
    const next = historyIndex.value === null ? prompts.value.length - 1 : Math.max(0, historyIndex.value - 1)
    showHistory(next, prompts.value[next] ?? '', 'start')
  } else if (plainArrow && event.key === 'ArrowDown' && historyIndex.value !== null && onLastLine(area)) {
    event.preventDefault()
    const next = historyIndex.value + 1
    if (next >= prompts.value.length) showHistory(null, savedDraft.value, 'end')
    else showHistory(next, prompts.value[next] ?? '', 'end')
  } else if (event.key === 'Escape' && busy.value) {
    void server.interrupt()
  }
}

// --- draft sync and recall -----------------------------------------------

let draftTimer: ReturnType<typeof setTimeout> | undefined
watch(text, (value) => {
  if (fromHistory) {
    fromHistory = false
  } else if (historyIndex.value !== null) {
    historyIndex.value = null
    savedDraft.value = value
  }

  clearTimeout(draftTimer)
  draftTimer = setTimeout(() => void server.syncDraft(value), 400)
})

watch(busy, (active) => {
  if (active) awaiting.value = false
})

// A new session has its own saved history. Prompts remembered here belong to the previous one.
watch(
  () => model.sessionId,
  () => {
    remembered.value = []
    historyIndex.value = null
  },
)

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

const quickOpen = ref(false)

// Fill puts the template at the cursor and keeps the draft, as the terminal does.
function fillQuick(template: string): void {
  const area = element()
  const at = area?.selectionStart ?? text.value.length
  text.value = `${text.value.slice(0, at)}${template}${text.value.slice(area?.selectionEnd ?? at)}`
  void nextTick(() => {
    const target = element()
    target?.focus()
    const end = at + template.length
    target?.setSelectionRange(end, end)
  })
}

const canQuick = computed(() => canOperate.value && server.can('GET /quick-prompts'))
const pickMode = (value: string) => void server.setMode('set', value)
const pickApproval = (value: string) => void server.send(`/approval ${value}`)
const pickThinking = (value: string) => void server.send(`/thinking ${value}`)

const mode = computed(() => modeLabel(model.chrome?.mode ?? ''))

// The choices come from the server's own command list, so a custom mode or a
// model with its own thinking gears shows exactly what the terminal offers.
const modeOptions = computed(() => modeChoices(model.commands))
const approvalOptions = computed(() => approvalModes(model.commands))
const thinkingOptions = computed(() => toOptions(findArguments(model.commands, 'thinking')))
const approvalValue = computed(() => (model.chrome?.approval ? displayToken(model.chrome.approval) : ''))

// The chrome carries "Think High". An empty string means the model has no thinking.
const thinkingValue = computed(() => (model.chrome?.thinking ?? '').replace(/^Think\s+/i, ''))
const currentThinking = computed(() => currentByLabel(thinkingOptions.value, thinkingValue.value))
</script>

<template>
  <div class="bg-background shrink-0 px-3 pt-2 pb-2 md:px-4 md:pt-3 md:pb-3" @dragover.prevent @drop="onDrop">
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
          ref="options"
          role="option"
          :aria-selected="index === choice"
          class="flex cursor-pointer items-baseline gap-3 rounded-md px-3 py-1.5 text-sm"
          :class="index === choice ? 'bg-accent text-accent-foreground' : ''"
          @mousedown.prevent="complete(index)"
        >
          <span class="font-mono">{{ picker?.nested ? '' : '/' }}{{ command.name }}</span>
          <span v-if="aliasesOf(command, picker?.nested ?? false).length" class="text-muted-foreground font-mono text-xs">
            ({{ aliasesOf(command, picker?.nested ?? false).join(', ') }})
          </span>
          <span class="text-muted-foreground truncate text-xs">{{ command.help }}</span>
        </li>
      </ul>

      <QuickPromptPicker v-model:open="quickOpen" @fill="fillQuick" />
      <FullscreenComposer
        v-model:open="fullOpen"
        v-model:text="text"
        :busy="busy"
        :blocked="blocked"
        @send="submit"
        @cancel="onCancel"
      />

      <p v-if="blocked" class="text-muted-foreground mb-2 text-sm">{{ t('composer.readonly') }}</p>

      <div class="bg-card focus-within:ring-ring rounded-xl border focus-within:ring-2">
        <div v-if="model.queue.length" class="border-b px-3 py-2">
          <p class="text-muted-foreground mb-1 text-xs font-medium">{{ t('composer.queued', { count: model.queue.length }) }}</p>
          <ol class="max-h-36 space-y-1 overflow-y-auto" :aria-label="t('composer.queued', { count: model.queue.length })">
            <li v-for="(item, index) in model.queue" :key="index" class="flex gap-2 text-sm">
              <span class="text-muted-foreground w-5 shrink-0 font-mono text-xs tabular-nums">{{ index + 1 }}.</span>
              <span class="line-clamp-3 min-w-0 flex-1 break-words" :title="item">{{ item }}</span>
            </li>
          </ol>
          <p class="text-muted-foreground mt-1 text-xs">{{ t('composer.queue.release') }}</p>
        </div>
        <Textarea
          ref="field"
          v-model="text"
          rows="2"
          :disabled="blocked"
          :placeholder="busy ? t('composer.placeholder.busy') : t('composer.placeholder')"
          :aria-label="t('composer.placeholder')"
          class="max-h-60 min-h-[3.5rem] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
          @keydown="onKeydown"
          @paste="onPaste"
          @compositionstart="composing = true"
          @compositionend="composing = false"
        />
        <div class="flex items-center gap-1 px-2 pb-2">
          <ComposerChip
            v-if="mode"
            :icon="Layers"
            :name="t('chip.mode')"
            :value="mode"
            :options="modeOptions"
            :current="model.chrome?.mode"
            :disabled="blocked"
            @pick="pickMode"
          />
          <ComposerChip
            v-if="approvalValue"
            :icon="ShieldCheck"
            :name="t('chip.approval')"
            :value="approvalValue"
            :options="approvalOptions"
            :current="model.chrome?.approval.toLowerCase()"
            :disabled="blocked || !isAdmin"
            :note="canOperate && !isAdmin ? t('chip.needsAdmin') : undefined"
            @pick="pickApproval"
          />
          <ComposerChip
            v-if="thinkingValue"
            :icon="Brain"
            :name="t('chip.thinking')"
            :value="thinkingValue"
            :options="thinkingOptions"
            :current="currentThinking"
            :disabled="blocked || !isAdmin"
            :note="canOperate && !isAdmin ? t('chip.needsAdmin') : undefined"
            @pick="pickThinking"
          />

          <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onPick" />
          <Button
            v-if="canAttach"
            variant="ghost"
            size="icon"
            class="size-10 md:size-8"
            :title="t('composer.attach')"
            :aria-label="t('composer.attach')"
            @click="fileInput?.click()"
          >
            <ImagePlus class="size-4" />
          </Button>

          <Button
            v-if="canQuick"
            variant="ghost"
            size="icon"
            class="size-10 md:size-8"
            :title="t('quick.title')"
            :aria-label="t('quick.title')"
            @click="quickOpen = true"
          >
            <Zap class="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            class="size-10 md:size-8"
            :disabled="blocked"
            :title="t('composer.expand')"
            :aria-label="t('composer.expand')"
            @click="fullOpen = true"
          >
            <Maximize2 class="size-4" />
          </Button>

          <span class="flex-1" />

          <Button v-if="busy" variant="outline" size="sm" :disabled="blocked || acting('stop')" @click="stop">
            <Spinner v-if="acting('stop')" class="size-3.5 motion-reduce:animate-none" />
            <Square v-else class="size-3.5" />
            {{ t('composer.stop') }}
          </Button>
          <Button
            size="icon"
            class="size-10 md:size-8"
            :disabled="blocked || (text.trim() === '' && !(busy && model.queue.length)) || sizeState(text) === 'over'"
            :aria-busy="sending || undefined"
            :aria-label="text.trim() === '' ? t('composer.queue.release') : t('composer.send')"
            @click="submit"
          >
            <Spinner v-if="sending" class="size-4 motion-reduce:animate-none" />
            <ArrowUp v-else class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
