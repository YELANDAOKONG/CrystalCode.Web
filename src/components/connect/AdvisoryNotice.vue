<script setup lang="ts">
import { computed } from 'vue'
import { TriangleAlert } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { Advisory, AdvisoryCode } from '@/connection/advisory'
import { t, type MessageKey } from '@/i18n'

const props = defineProps<{ advisory: Advisory }>()

const lines = computed(() =>
  props.advisory.codes
    .filter((code): code is Exclude<AdvisoryCode, 'none'> => code !== 'none')
    .map((code) => ({ code, text: t(`advisory.${code}` as MessageKey) })),
)
</script>

<template>
  <Alert v-if="lines.length > 0" :variant="advisory.likelyBlocked ? 'destructive' : 'default'">
    <TriangleAlert />
    <AlertTitle>{{ advisory.likelyBlocked ? t('advisory.title') : t('advisory.note.title') }}</AlertTitle>
    <AlertDescription>
      <ul class="list-disc space-y-1 pl-4">
        <li v-for="line in lines" :key="line.code">{{ line.text }}</li>
      </ul>
    </AlertDescription>
  </Alert>
</template>
