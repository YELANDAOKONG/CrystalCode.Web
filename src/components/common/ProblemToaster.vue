<script setup lang="ts">
import { watch } from 'vue'
import { toast } from 'vue-sonner'
import { server } from '@/app/server'
import { Toaster } from '@/components/ui/sonner'
import { t, type MessageKey } from '@/i18n'
import { ProtocolError } from '@/protocol/errors'

// A failed action reports here. The server's text is shown as received and
// follows the interface message, since it is English and may explain the cause.
function describe(error: unknown): string {
  if (!(error instanceof ProtocolError)) return t('error.other')
  const kind = error.kind === 'host' ? 'bad-request' : error.kind
  const key = `error.${kind}` as MessageKey
  const known = ['unauthorized', 'forbidden', 'rate-limited', 'not-ready', 'conflict', 'bad-request', 'too-large', 'network', 'server']
  return t(known.includes(kind) ? key : 'error.other', { detail: error.message }).trim()
}

watch(
  () => server.problem.value,
  (problem) => {
    if (problem) toast.error(describe(problem.error))
  },
)
</script>

<template>
  <Toaster position="top-center" :duration="6000" close-button rich-colors />
</template>
