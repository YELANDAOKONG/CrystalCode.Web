<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n'
import type { Question } from '@/protocol/types'

const props = defineProps<{ questions: Question[]; disabled: boolean }>()
const emit = defineEmits<{ submit: [answers: string[][]]; dismiss: [] }>()

interface Entry {
  picked: string[]
  custom: string
  customOn: boolean
}

const entries = reactive<Entry[]>(props.questions.map(() => ({ picked: [], custom: '', customOn: false })))

function toggle(entry: Entry, question: Question, label: string, on: boolean): void {
  if (!question.multiple) {
    entry.picked = on ? [label] : []
    if (on) entry.customOn = false
    return
  }

  entry.picked = on ? [...entry.picked, label] : entry.picked.filter((item) => item !== label)
}

function toggleCustom(entry: Entry, question: Question, on: boolean): void {
  entry.customOn = on
  if (on && !question.multiple) entry.picked = []
}

// Typing into the custom field selects it.
function typeCustom(entry: Entry, question: Question, value: string | number): void {
  entry.custom = String(value)
  if (entry.custom !== '' && !entry.customOn) toggleCustom(entry, question, true)
}

function answerFor(entry: Entry, question: Question): string[] {
  const custom = entry.custom.trim()
  if (!question.custom || !entry.customOn || custom === '') return entry.picked
  return question.multiple ? [...entry.picked, custom] : [custom]
}

const ready = computed(() => props.questions.every((question, index) => answerFor(entries[index]!, question).length > 0))

function submit(): void {
  if (!ready.value) return
  emit('submit', props.questions.map((question, index) => answerFor(entries[index]!, question)))
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <fieldset v-for="(question, index) in questions" :key="index" class="space-y-2" :disabled="disabled">
      <legend class="text-muted-foreground text-xs font-medium tracking-wide uppercase">{{ question.header }}</legend>
      <p class="text-sm whitespace-pre-wrap">{{ question.text }}</p>
      <label
        v-for="option in question.options"
        :key="option.label"
        class="hover:bg-accent flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2"
      >
        <input
          :type="question.multiple ? 'checkbox' : 'radio'"
          :name="`question-${index}`"
          class="accent-primary mt-1"
          :checked="entries[index]!.picked.includes(option.label)"
          @change="toggle(entries[index]!, question, option.label, ($event.target as HTMLInputElement).checked)"
        />
        <span>
          <span class="block text-sm font-medium">{{ option.label }}</span>
          <span v-if="option.description" class="text-muted-foreground block text-xs">{{ option.description }}</span>
        </span>
      </label>
      <div v-if="question.custom" class="flex items-center gap-3 rounded-md border px-3 py-2">
        <input
          :type="question.multiple ? 'checkbox' : 'radio'"
          :name="`question-${index}`"
          class="accent-primary"
          :aria-label="t('interaction.question.custom')"
          :checked="entries[index]!.customOn"
          @change="toggleCustom(entries[index]!, question, ($event.target as HTMLInputElement).checked)"
        />
        <Input
          :model-value="entries[index]!.custom"
          :aria-label="t('interaction.question.custom')"
          :placeholder="t('interaction.question.custom')"
          @update:model-value="typeCustom(entries[index]!, question, $event)"
        />
      </div>
    </fieldset>
    <div class="flex justify-end gap-2">
      <Button type="button" variant="ghost" :disabled="disabled" @click="emit('dismiss')">{{ t('interaction.dismiss') }}</Button>
      <Button type="submit" :disabled="disabled || !ready">{{ t('interaction.submit') }}</Button>
    </div>
  </form>
</template>
