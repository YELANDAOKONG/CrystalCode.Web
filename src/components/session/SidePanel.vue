<script setup lang="ts">
import { server } from '@/app/server'
import MarkdownView from '@/components/render/MarkdownView.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { t } from '@/i18n'

const model = server.model
</script>

<template>
  <aside class="bg-card w-80 shrink-0 space-y-6 overflow-y-auto border-l p-4 text-sm">
    <section>
      <h2 class="mb-2 text-xs font-medium tracking-wide uppercase">{{ t('panel.todos') }}</h2>
      <p v-if="model.todos.length === 0" class="text-muted-foreground">{{ t('panel.todos.empty') }}</p>
      <ul v-else class="space-y-1.5">
        <li v-for="todo in model.todos" :key="todo.id" class="flex items-start gap-2">
          <Badge variant="outline" class="shrink-0">{{ todo.status }}</Badge>
          <span :class="todo.status === 'completed' ? 'text-muted-foreground line-through' : ''">{{ todo.content }}</span>
        </li>
      </ul>
    </section>

    <section v-if="model.chrome?.agentsEnabled">
      <h2 class="mb-2 text-xs font-medium tracking-wide uppercase">{{ t('panel.children') }}</h2>
      <p v-if="model.children.length === 0" class="text-muted-foreground">{{ t('panel.children.empty') }}</p>
      <ul v-else class="space-y-2">
        <li v-for="child in model.children" :key="child.id" class="rounded-md border p-2">
          <div class="flex items-center gap-2">
            <span class="min-w-0 flex-1 truncate font-medium">{{ child.label || child.agent }}</span>
            <Badge variant="secondary">{{ child.status }}</Badge>
          </div>
          <div class="text-muted-foreground mt-1 text-xs">
            {{ t('panel.children.calls', { model: child.modelCalls, tool: child.toolCalls }) }}
          </div>
        </li>
      </ul>
    </section>

    <section v-if="model.side.exchanges.length || model.side.running || model.side.failure">
      <div class="mb-2 flex items-center gap-2">
        <h2 class="flex-1 text-xs font-medium tracking-wide uppercase">{{ t('panel.side') }}</h2>
        <Button v-if="model.side.running" variant="ghost" size="sm" @click="server.cancelSide()">{{ t('panel.side.cancel') }}</Button>
        <Button v-else variant="ghost" size="sm" @click="server.clearSide()">{{ t('panel.side.clear') }}</Button>
      </div>
      <div v-for="(exchange, index) in model.side.exchanges" :key="index" class="mb-3 space-y-1">
        <p class="font-medium whitespace-pre-wrap">{{ exchange.question }}</p>
        <MarkdownView :source="exchange.answer" />
      </div>
      <div v-if="model.side.running" class="space-y-1">
        <p class="font-medium whitespace-pre-wrap">{{ model.side.pendingQuestion }}</p>
        <MarkdownView v-if="model.side.liveAnswer" :source="model.side.liveAnswer" streaming />
        <p v-else class="text-muted-foreground">{{ t('panel.side.running') }}</p>
      </div>
      <p v-if="model.side.failure" role="alert" class="text-destructive">{{ model.side.failure }}</p>
    </section>
  </aside>
</template>
