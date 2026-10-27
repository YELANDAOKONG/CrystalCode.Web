<script setup lang="ts">
import { computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { server } from '@/app/server'
import { Toaster } from '@/components/ui/sonner'
import { t, type MessageKey } from '@/i18n'
import { ProtocolError } from '@/protocol/errors'
import { useTheme } from '@/theme/theme'

const { theme } = useTheme()
// The toaster has its own palette, so it must follow the theme the operator
// picked here, not only the system setting.
const toasterTheme = computed(() => (theme.value === 'auto' ? 'system' : theme.value))

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
  <Toaster position="top-center" :theme="toasterTheme" :duration="6000" close-button rich-colors />
</template>
