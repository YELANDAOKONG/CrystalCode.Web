<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowUp, Minimize2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { t } from '@/i18n'
import { bodyBytes, formatBytes, MAX_BODY_BYTES, sizeState } from '@/session/draft-size'

const open = defineModel<boolean>('open', { required: true })
const text = defineModel<string>('text', { required: true })

const props = defineProps<{ busy: boolean; blocked: boolean }>()
const emit = defineEmits<{ send: [] }>()

const area = ref<InstanceType<typeof Textarea> | null>(null)
const composing = ref(false)

const isApple = /Mac|iPhone|iPad/.test(navigator.platform)
const shortcut = isApple ? '⌘ Enter' : 'Ctrl Enter'

const state = computed(() => sizeState(text.value))
const bytes = computed(() => bodyBytes(text.value))
const limit = formatBytes(MAX_BODY_BYTES)
const canSend = computed(() => !props.blocked && text.value.trim() !== '' && state.value !== 'over')

// Opening moves focus to the end of the draft, where the writer left off.
watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  const element = (area.value?.$el as HTMLTextAreaElement | undefined) ?? null
  element?.focus()
  element?.setSelectionRange(text.value.length, text.value.length)
})

function onKeydown(event: KeyboardEvent): void {
  if (composing.value || event.isComposing) return
  // Enter writes a new line here, so the send shortcut needs a modifier.
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    send()
  }
}

function send(): void {
  if (!canSend.value) return
  emit('send')
  open.value = false
}

const chars = computed(() => new Intl.NumberFormat().format([...text.value].length))
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      :show-close-button="false"
      class="inset-0 top-0 left-0 flex h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none"
    >
      <header class="flex items-center gap-2 border-b px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div class="min-w-0 flex-1">
          <DialogTitle class="text-sm font-medium">{{ t('full.title') }}</DialogTitle>
          <DialogDescription class="text-muted-foreground text-xs">{{ t('full.description', { shortcut }) }}</DialogDescription>
        </div>
        <Button variant="ghost" class="h-10 px-3 sm:h-9" @click="open = false">
          <Minimize2 class="size-4" />
          {{ t('full.done') }}
        </Button>
      </header>

      <div class="min-h-0 flex-1 overflow-hidden p-3 md:p-6">
        <Textarea
          ref="area"
          v-model="text"
          :disabled="blocked"
          :placeholder="t('full.placeholder')"
          :aria-label="t('full.title')"
          class="mx-auto block h-full w-full max-w-3xl resize-none border-0 bg-transparent px-0 dark:bg-transparent text-base leading-relaxed shadow-none focus-visible:ring-0 md:text-base"
          @keydown="onKeydown"
          @compositionstart="composing = true"
          @compositionend="composing = false"
        />
      </div>

      <footer class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <p class="text-muted-foreground text-xs tabular-nums">{{ t('full.count', { chars, size: formatBytes(bytes) }) }}</p>
        <p v-if="state === 'over'" role="alert" class="text-destructive min-w-0 flex-1 text-xs">{{ t('full.tooLarge', { limit }) }}</p>
        <p v-else-if="state === 'near'" role="status" class="min-w-0 flex-1 text-xs text-amber-600 dark:text-amber-400">
          {{ t('full.nearLimit', { limit }) }}
        </p>
        <span v-else class="flex-1" />
        <Button variant="ghost" class="h-10 sm:h-9" :disabled="text === '' || blocked" @click="text = ''">{{ t('full.discard') }}</Button>
        <Button class="h-10 sm:h-9" :disabled="!canSend" @click="send">
          <ArrowUp class="size-4" />
          {{ busy ? t('composer.queued', { count: 1 }) : t('full.send') }}
        </Button>
      </footer>
    </DialogContent>
  </Dialog>
</template>
