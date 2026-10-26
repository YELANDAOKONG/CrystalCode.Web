<script setup lang="ts">
import { ref, watch } from 'vue'
import { RefreshCw } from '@lucide/vue'
import { server } from '@/app/server'
import MarkdownView from '@/components/render/MarkdownView.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { t } from '@/i18n'
import type { ChildSummary } from '@/protocol/types'
import { toBlocks } from '@/session/blocks'
import ToolBlock from './ToolBlock.vue'

const childId = defineModel<string | null>('childId', { required: true })

const child = ref<ChildSummary | null>(null)
const loading = ref(false)
const failed = ref(false)

async function load(): Promise<void> {
  const id = childId.value
  if (!id) return
  loading.value = true
  failed.value = false
  const result = await server.loadChild(id)
  if (id !== childId.value) return
  child.value = result ?? null
  failed.value = result === undefined
  loading.value = false
}

watch(childId, (id) => {
  child.value = null
  if (id) void load()
})

// A running child keeps working while the sheet is open, so the archive is
// fetched again whenever the list entry for this child changes.
watch(
  () => server.model.children.find((item) => item.id === childId.value),
  (live) => {
    if (live && child.value) child.value = { ...child.value, ...live, archive: child.value.archive }
    if (live && (live.status === 'completed' || live.status === 'failed')) void load()
  },
)

const roleKey = (role: string) => (role === 'user' ? 'session.role.user' : 'session.role.assistant')
const number = new Intl.NumberFormat()
</script>

<template>
  <Sheet :open="childId !== null" @update:open="(open) => !open && (childId = null)">
    <SheetContent side="right" class="w-full overflow-y-auto sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{{ child?.label || child?.agent || t('child.title') }}</SheetTitle>
        <SheetDescription class="flex flex-wrap items-center gap-2">
          <template v-if="child">
            <Badge variant="secondary">{{ child.status }}</Badge>
            <span class="font-mono text-xs">{{ child.agent }}</span>
          </template>
        </SheetDescription>
      </SheetHeader>

      <div class="space-y-4 px-4 pb-6">
        <div v-if="child" class="text-muted-foreground space-y-1 text-xs">
          <p v-if="child.model.model">{{ t('child.model') }}: {{ [child.model.provider, child.model.model, child.model.thinking].filter(Boolean).join(' · ') }}</p>
          <p v-if="child.tools.length">{{ t('child.tools') }}: <span class="font-mono">{{ child.tools.join(', ') }}</span></p>
          <p v-if="child.cumulativeUsage ?? child.usage">
            {{ t('child.usage') }}: {{ number.format((child.cumulativeUsage ?? child.usage)!.inputTokens) }} IN /
            {{ number.format((child.cumulativeUsage ?? child.usage)!.outputTokens) }} OUT
          </p>
          <p>{{ t('panel.children.calls', { model: child.modelCalls, tool: child.toolCalls }) }}</p>
        </div>

        <Button variant="outline" size="sm" :disabled="loading" @click="load">
          <RefreshCw class="size-3.5" :class="loading ? 'animate-spin' : ''" />
          {{ t('child.refresh') }}
        </Button>

        <p v-if="loading && !child?.archive" class="text-muted-foreground text-sm">{{ t('child.loading') }}</p>
        <p v-else-if="failed" role="alert" class="text-destructive text-sm">{{ t('child.failed') }}</p>
        <template v-else-if="child?.archive">
          <p v-if="child.archive.length === 0" class="text-muted-foreground text-sm">{{ t('child.empty') }}</p>
          <template v-for="block in toBlocks(child.archive)" :key="block.key">
            <section v-if="block.kind === 'message'" class="text-sm">
              <div class="text-muted-foreground mb-1 text-xs font-medium">{{ t(roleKey(block.role)) }}</div>
              <MarkdownView v-if="block.role !== 'user'" :source="block.text" />
              <p v-else class="whitespace-pre-wrap">{{ block.text }}</p>
            </section>
            <details v-else-if="block.kind === 'reasoning'" class="text-muted-foreground text-sm">
              <summary class="cursor-pointer">{{ t('session.reasoning') }}</summary>
              <MarkdownView :source="block.text" />
            </details>
            <ToolBlock v-else :call="block.call" :result="block.result" />
          </template>
        </template>

        <section v-if="child?.todos.length">
          <h3 class="mb-1 text-sm font-medium">{{ t('child.tasks') }}</h3>
          <ul class="space-y-1 text-sm">
            <li v-for="todo in child.todos" :key="todo.id" class="flex gap-2">
              <span class="text-muted-foreground w-24 shrink-0 text-xs leading-5">{{ todo.status }}</span>
              <span>{{ todo.content }}</span>
            </li>
          </ul>
        </section>
        <section v-if="child?.notes.length">
          <h3 class="mb-1 text-sm font-medium">{{ t('child.notes') }}</h3>
          <ul class="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
            <li v-for="(note, index) in child.notes" :key="index">{{ note }}</li>
          </ul>
        </section>
      </div>
    </SheetContent>
  </Sheet>
</template>
