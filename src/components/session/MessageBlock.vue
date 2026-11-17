<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Check, Copy } from '@lucide/vue'
import MarkdownView from '@/components/render/MarkdownView.vue'
import { Button } from '@/components/ui/button'
import { t } from '@/i18n'
import ImageStrip from './ImageStrip.vue'

// One finished message. The reader's own text sits in a bubble on the right, the
// model's reply is plain text. The copy action floats into the gap below it, so
// it takes no room of its own.
const props = defineProps<{ role: string; text: string; images: number[] }>()

// The reader's images follow the order of their markers in the text. Images
// without a marker keep the server's order after them.
const ordered = computed(() => {
  if (props.role !== 'user') return props.images
  const marked = [...props.text.matchAll(/\[Image #(\d+)\]/g)].map((match) => Number(match[1]))
  const first = [...new Set(marked)].filter((number) => props.images.includes(number))
  return [...first, ...props.images.filter((number) => !first.includes(number))]
})

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(timer))

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    clearTimeout(timer)
    timer = setTimeout(() => (copied.value = false), 1500)
  } catch {
    // Clipboard access can be denied on an insecure page. The text stays selectable.
  }
}
</script>

<template>
  <section class="group/message relative min-w-0" :class="role === 'user' ? 'max-w-[85%] self-end' : 'mr-4'">
    <div v-if="role === 'user'" class="bg-secondary rounded-2xl px-4 py-2.5">
      <p class="wrap-anywhere whitespace-pre-wrap">{{ text }}</p>
    </div>
    <MarkdownView v-else :source="text" />
    <ImageStrip v-if="images.length" :numbers="ordered" :thumb="role === 'user'" class="mt-2" :class="role === 'user' && 'justify-end'" />
    <div
      v-if="text"
      class="absolute top-full flex h-5 opacity-0 transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100 [@media(hover:none)]:static [@media(hover:none)]:mt-1 [@media(hover:none)]:h-auto [@media(hover:none)]:opacity-100"
      :class="role === 'user' ? 'right-0 justify-end' : 'left-0 -ml-2'"
    >
      <Button variant="ghost" size="sm" class="text-muted-foreground h-5 px-2 text-xs [@media(hover:none)]:h-7" @click="copy">
        <Check v-if="copied" class="size-3.5" />
        <Copy v-else class="size-3.5" />
        {{ copied ? t('common.copied') : t('common.copy') }}
      </Button>
    </div>
  </section>
</template>
