<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { Check, Copy } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { t } from '@/i18n'
import { highlight, type CodeToken } from '@/render/highlight'

const props = defineProps<{ lang: string; value: string; streaming?: boolean }>()

const lines = ref<CodeToken[][] | null>(null)
const copied = ref(false)

// While text is still arriving the block stays plain. Highlighting runs once
// the block is complete, so a long reply is not re-tokenized on every chunk.
watchEffect(async (onCleanup) => {
  if (props.streaming || props.lang === '') {
    lines.value = null
    return
  }

  let stale = false
  onCleanup(() => {
    stale = true
  })
  const result = await highlight(props.value, props.lang)
  if (!stale) lines.value = result
})

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    // Clipboard access can be denied on an insecure page. The text stays selectable.
  }
}
</script>

<template>
  <div class="code-block group relative my-3 overflow-hidden rounded-lg border">
    <div class="text-muted-foreground flex items-center justify-between border-b px-3 py-1 font-mono text-xs">
      <span>{{ lang }}</span>
      <Button variant="ghost" size="sm" class="h-6 px-2 text-xs" @click="copy">
        <Check v-if="copied" class="size-3" />
        <Copy v-else class="size-3" />
        {{ copied ? t('common.copied') : t('common.copy') }}
      </Button>
    </div>
    <pre class="overflow-x-auto p-3 font-mono text-[0.8125rem] leading-relaxed"><code v-if="lines"><template
      v-for="(line, row) in lines"
      :key="row"
    ><span
      v-for="(token, col) in line"
      :key="col"
      class="token"
      :class="{ 'italic': token.italic, 'font-semibold': token.bold }"
      :style="{ '--l': token.light ?? 'inherit', '--d': token.dark ?? 'inherit' }"
    >{{ token.text }}</span>{{ row < lines.length - 1 ? '\n' : '' }}</template></code><code v-else>{{ value }}</code></pre>
  </div>
</template>
