<script setup lang="ts">
import { computed } from 'vue'
import { Circle, CircleCheck, CircleDot, CircleX } from '@lucide/vue'
import { server } from '@/app/server'
import { t, type MessageKey } from '@/i18n'

const model = server.model

const KNOWN = ['pending', 'in_progress', 'completed', 'cancelled'] as const

const done = computed(() => model.todos.filter((todo) => todo.status === 'completed').length)

function label(status: string): string {
  return (KNOWN as readonly string[]).includes(status) ? t(`todo.status.${status}` as MessageKey) : status
}
</script>

<template>
  <section aria-labelledby="todos-title">
    <div class="mb-2 flex items-baseline justify-between gap-2">
      <h2 id="todos-title" class="text-sm font-medium">{{ t('panel.todos') }}</h2>
      <span v-if="model.todos.length" class="text-muted-foreground text-xs tabular-nums">
        {{ t('panel.todos.progress', { done, total: model.todos.length }) }}
      </span>
    </div>

    <p v-if="model.todos.length === 0" class="text-muted-foreground text-sm">{{ t('panel.todos.empty') }}</p>
    <ul v-else class="-mx-2 space-y-0.5">
      <li
        v-for="todo in model.todos"
        :key="todo.id"
        class="flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm leading-snug"
        :class="todo.status === 'in_progress' ? 'bg-accent' : ''"
      >
        <CircleCheck v-if="todo.status === 'completed'" class="text-ok mt-px size-4 shrink-0" aria-hidden="true" />
        <CircleDot v-else-if="todo.status === 'in_progress'" class="text-ring mt-px size-4 shrink-0" aria-hidden="true" />
        <CircleX v-else-if="todo.status === 'cancelled'" class="text-muted-foreground mt-px size-4 shrink-0" aria-hidden="true" />
        <Circle v-else class="text-muted-foreground mt-px size-4 shrink-0" aria-hidden="true" />
        <span class="sr-only">{{ label(todo.status) }}:</span>
        <span
          class="min-w-0 break-words"
          :class="{
            'text-muted-foreground': todo.status === 'completed' || todo.status === 'cancelled',
            'line-through': todo.status === 'cancelled',
          }"
        >
          {{ todo.content }}
        </span>
      </li>
    </ul>
  </section>
</template>
