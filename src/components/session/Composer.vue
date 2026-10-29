<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { Spinner } from '@/components/ui/spinner'
import { useBusy } from '@/composables/busy'
import { ArrowUp, Brain, ImagePlus, Layers, Maximize2, ShieldCheck, Square, Undo2, Zap } from '@lucide/vue'
import { server } from '@/app/server'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { t } from '@/i18n'
import { displayToken } from '@/session/display-case'
import { modeLabel } from '@/session/mode'
import { approvalModes, currentByLabel, findArguments, toOptions, type Option } from '@/session/settings'
import { sizeState } from '@/session/draft-size'
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

const busy = computed(() => model.turnActive)
const blocked = computed(() => !canOperate.value)

// --- slash command suggestions ------------------------------------------

// Commands, their aliases, and their arguments, three levels deep, from the
// server's own list. A picker is only offered while the draft is one line.
const picker = computed(() => createPicker(text.value, model.commands))
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
const sending = computed(() => acting('send'))
const recall = () => void track('recall', () => server.recall())
const stop = () => void track('stop', () => server.interrupt())

async function submit(): Promise<void> {
  const value = text.value
  if (blocked.value || value.trim() === '' || sizeState(value) === 'over') return
  // The server answers only after it has handled the text (hooks, a slash
  // command, starting the turn), so clearing on the answer left the draft
  // frozen in the box. Clear now and put the text back if the request fails.
  text.value = ''
  historyIndex.value = null
  const result = await track('send', () => server.send(value))
  // A refused input (the reason arrives as an error notice) keeps its text.
  if ((!result || !result.accepted) && text.value === '') text.value = value
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
const modeOptions = computed<Option[]>(() =>
  toOptions(findArguments(model.commands, 'mode')).map((option) => ({ ...option, label: modeLabel(option.value) })),
)
const approvalOptions = computed(() => approvalModes(model.commands))
const thinkingOptions = computed(() => toOptions(findArguments(model.commands, 'thinking')))
const approvalValue = computed(() => (model.chrome?.approval ? displayToken(model.chrome.approval) : ''))

// The chrome carries "Think High". An empty string means the model has no thinking.
const thinkingValue = computed(() => (model.chrome?.thinking ?? '').replace(/^Think\s+/i, ''))
const currentThinking = computed(() => currentByLabel(thinkingOptions.value, thinkingValue.value))
</script>

<template>
  <div class="bg-background px-3 pt-2 pb-2 md:px-4 md:pt-3 md:pb-3" @dragover.prevent @drop="onDrop">
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
      />

      <p v-if="blocked" class="text-muted-foreground mb-2 text-sm">{{ t('composer.readonly') }}</p>

      <div class="bg-card focus-within:ring-ring rounded-xl border focus-within:ring-2">
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

          <Button
            v-if="model.queue.length"
            variant="ghost"
            size="sm"
            :disabled="blocked"
            :title="t('composer.recall')"
            @click="recall"
          >
            <Spinner v-if="acting('recall')" class="size-4 motion-reduce:animate-none" />
            <Undo2 v-else class="size-4" />
            {{ t('composer.queued', { count: model.queue.length }) }}
          </Button>
          <Button v-if="busy" variant="outline" size="sm" :disabled="blocked || acting('stop')" @click="stop">
            <Spinner v-if="acting('stop')" class="size-3.5 motion-reduce:animate-none" />
            <Square v-else class="size-3.5" />
            {{ t('composer.stop') }}
          </Button>
          <Button size="icon" class="size-10 md:size-8" :disabled="blocked || text.trim() === ''" :aria-busy="sending || undefined" :aria-label="t('composer.send')" @click="submit">
            <Spinner v-if="sending" class="size-4 motion-reduce:animate-none" />
            <ArrowUp v-else class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
