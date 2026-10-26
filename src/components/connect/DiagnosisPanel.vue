<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { Diagnosis } from '@/connection/diagnosis'
import { t, type MessageKey } from '@/i18n'

defineProps<{ diagnosis: Diagnosis; origin: string }>()
</script>

<template>
  <Alert variant="destructive" role="alert">
    <CircleAlert />
    <AlertTitle>{{ t('diagnosis.title') }}</AlertTitle>
    <AlertDescription class="space-y-2">
      <p v-if="diagnosis.code === 'rate-limited' && diagnosis.retryAfter !== null">
        {{ t('diagnosis.rate-limited', { seconds: diagnosis.retryAfter }) }}
      </p>
      <p v-else-if="diagnosis.code === 'rate-limited'">{{ t('diagnosis.rate-limited.soon') }}</p>
      <p v-else>{{ t(`diagnosis.${diagnosis.code}` as MessageKey) }}</p>
      <ul v-if="diagnosis.checklist.length > 0" class="list-disc space-y-1 pl-4">
        <li v-for="item in diagnosis.checklist" :key="item">
          {{ t(`diagnosis.check.${item}` as MessageKey, { origin }) }}
        </li>
      </ul>
      <p v-if="diagnosis.detail" class="font-mono text-xs break-words opacity-80">
        {{ t('diagnosis.detail') }}: {{ diagnosis.detail }}
      </p>
    </AlertDescription>
  </Alert>
</template>
