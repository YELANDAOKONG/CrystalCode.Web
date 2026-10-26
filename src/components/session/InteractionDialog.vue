<script setup lang="ts">
import { computed, ref } from 'vue'
import { server } from '@/app/server'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { t, type MessageKey } from '@/i18n'
import { displayToken } from '@/session/display-case'
import { modeLabel } from '@/session/mode'
import type { Interaction, Verdict } from '@/protocol/types'
import { prettyArguments } from '@/session/blocks'
import QuestionForm from './QuestionForm.vue'

const props = defineProps<{ interaction: Interaction; waiting: number }>()

const { canOperate, isAdmin } = server
const busy = ref(false)

// The server offers the choices; this dialog only labels them.
const CHOICE_LABELS: Record<string, MessageKey> = {
  once: 'interaction.approval.once',
  session: 'interaction.approval.session',
  always: 'interaction.approval.always',
  deny: 'interaction.approval.deny',
}

const needsAdmin = computed(() => props.interaction.kind === 'trust')
const allowed = computed(() => canOperate.value && (!needsAdmin.value || isAdmin.value))
const disabled = computed(() => busy.value || !allowed.value)

async function answer(body: unknown): Promise<void> {
  busy.value = true
  try {
    await server.answer(props.interaction.id, body)
  } finally {
    busy.value = false
  }
}

function verdictLines(verdict: Verdict | null): string {
  return verdict ? `${verdict.outcome} · ${verdict.riskLevel} · ${verdict.userAuthorization}\n${verdict.rationale}` : ''
}

const title = computed<MessageKey>(() => {
  switch (props.interaction.kind) {
    case 'approval':
      return 'interaction.approval.title'
    case 'trust':
      return 'interaction.trust.title'
    case 'choose_session':
      return 'interaction.session.title'
    case 'choose_child':
      return 'interaction.child.title'
    default:
      return 'interaction.pending'
  }
})

// Narrowed views of the payload for the template.
const approval = computed(() => (props.interaction.kind === 'approval' ? (props.interaction as Extract<Interaction, { kind: 'approval' }>) : null))
const question = computed(() => (props.interaction.kind === 'question' ? (props.interaction as Extract<Interaction, { kind: 'question' }>) : null))
const trust = computed(() => (props.interaction.kind === 'trust' ? (props.interaction as Extract<Interaction, { kind: 'trust' }>) : null))
const sessions = computed(() => (props.interaction.kind === 'choose_session' ? (props.interaction as Extract<Interaction, { kind: 'choose_session' }>) : null))
const children = computed(() => (props.interaction.kind === 'choose_child' ? (props.interaction as Extract<Interaction, { kind: 'choose_child' }>) : null))
</script>

<template>
  <AlertDialog :open="true">
    <AlertDialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-xl" @escape-key-down.prevent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t(title) }}</AlertDialogTitle>
        <AlertDialogDescription v-if="waiting > 0">{{ t('interaction.more', { count: waiting }) }}</AlertDialogDescription>
        <AlertDialogDescription v-else class="sr-only">{{ t('interaction.pending') }}</AlertDialogDescription>
      </AlertDialogHeader>

      <p v-if="!canOperate" class="text-destructive text-sm">{{ t('interaction.needsOperate') }}</p>
      <p v-else-if="needsAdmin && !isAdmin" class="text-destructive text-sm">{{ t('interaction.needsAdmin') }}</p>

      <div v-if="approval" class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-mono text-sm font-medium">{{ approval.call.name }}</span>
          <Badge variant="outline">{{ t('interaction.approval.risk', { risk: displayToken(approval.classification.risk) }) }}</Badge>
          <Badge variant="outline">{{ t('interaction.approval.authority', { authority: displayToken(approval.classification.authority) }) }}</Badge>
        </div>
        <p v-if="approval.classification.summary" class="text-sm whitespace-pre-wrap">{{ approval.classification.summary }}</p>
        <pre class="bg-muted max-h-56 overflow-auto rounded-md p-2 font-mono text-xs whitespace-pre-wrap">{{ prettyArguments(approval.call.arguments) }}</pre>
        <div v-if="approval.review" class="text-sm">
          <div class="text-muted-foreground text-xs font-medium">{{ t('interaction.approval.review') }}</div>
          <p class="whitespace-pre-wrap">{{ verdictLines(approval.review) }}</p>
        </div>
        <div v-if="approval.extendedReview" class="text-sm">
          <div class="text-muted-foreground text-xs font-medium">{{ t('interaction.approval.extended') }}</div>
          <p class="whitespace-pre-wrap">{{ verdictLines(approval.extendedReview) }}</p>
        </div>
        <div class="flex flex-wrap justify-end gap-2">
          <Button
            v-for="choice in approval.choices"
            :key="choice"
            :variant="choice === 'deny' ? 'outline' : choice === 'once' ? 'default' : 'secondary'"
            :disabled="disabled"
            @click="answer({ choice })"
          >
            {{ CHOICE_LABELS[choice] ? t(CHOICE_LABELS[choice]) : choice }}
          </Button>
        </div>
      </div>

      <QuestionForm
        v-else-if="question"
        :questions="question.questions"
        :disabled="disabled"
        @submit="(answers) => answer({ answers })"
        @dismiss="answer({ dismissed: true })"
      />

      <div v-else-if="trust" class="space-y-3 text-sm">
        <dl class="space-y-2">
          <div>
            <dt class="text-muted-foreground text-xs">{{ t('interaction.trust.workspace') }}</dt>
            <dd class="font-mono break-all">{{ trust.workspace }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-xs">{{ t('interaction.trust.root') }}</dt>
            <dd class="font-mono break-all">{{ trust.trustRoot }}</dd>
          </div>
        </dl>
        <p v-if="trust.coversRepository" class="text-muted-foreground">{{ t('interaction.trust.repository') }}</p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" :disabled="disabled" @click="answer({ trust: false })">{{ t('interaction.trust.no') }}</Button>
          <Button :disabled="disabled" @click="answer({ trust: true })">{{ t('interaction.trust.yes') }}</Button>
        </div>
      </div>

      <div v-else-if="sessions" class="space-y-2">
        <ul class="max-h-80 space-y-1 overflow-y-auto">
          <li v-for="item in sessions.sessions" :key="item.id">
            <button
              type="button"
              class="hover:bg-accent focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
              :disabled="disabled"
              @click="answer({ sessionId: item.id })"
            >
              <span class="flex items-center gap-2">
                <span class="truncate font-medium">{{ item.preview || item.id }}</span>
                <Badge v-if="item.id === sessions.currentId" variant="secondary">{{ t('interaction.session.current') }}</Badge>
              </span>
              <span class="text-muted-foreground block truncate font-mono text-xs">
                {{ item.workspace }} · {{ modeLabel(item.mode) }} · {{ t('interaction.session.turns', { count: item.userTurns }) }}
              </span>
            </button>
          </li>
        </ul>
        <div class="flex justify-end">
          <Button variant="ghost" :disabled="disabled" @click="answer({ sessionId: null })">{{ t('interaction.decline') }}</Button>
        </div>
      </div>

      <div v-else-if="children" class="space-y-2">
        <ul class="max-h-80 space-y-1 overflow-y-auto">
          <li v-for="item in children.children" :key="item.id">
            <button
              type="button"
              class="hover:bg-accent focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
              :disabled="disabled"
              @click="answer({ childId: item.id })"
            >
              <span class="font-medium">{{ item.label || item.id }}</span>
              <span class="text-muted-foreground block text-xs">{{ item.agent }} · {{ item.status }}</span>
            </button>
          </li>
        </ul>
        <div class="flex justify-end">
          <Button variant="ghost" :disabled="disabled" @click="answer({ childId: null })">{{ t('interaction.decline') }}</Button>
        </div>
      </div>

      <p v-else class="text-sm">{{ t('interaction.unknown', { kind: interaction.kind }) }}</p>
    </AlertDialogContent>
  </AlertDialog>
</template>
