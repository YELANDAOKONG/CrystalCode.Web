<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { server } from '@/app/server'
import { t } from '@/i18n'

const props = defineProps<{ number: number }>()

type Loaded = { kind: 'blob'; url: string } | { kind: 'remote'; uri: string } | { kind: 'failed' } | { kind: 'loading' }

const state = ref<Loaded>({ kind: 'loading' })
let objectUrl: string | null = null

function release(): void {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
}

watch(
  () => props.number,
  async (number) => {
    release()
    state.value = { kind: 'loading' }
    const result = await server.loadImage(number)
    if (number !== props.number) return
    if (!result) {
      state.value = { kind: 'failed' }
    } else if ('blob' in result) {
      objectUrl = URL.createObjectURL(result.blob)
      state.value = { kind: 'blob', url: objectUrl }
    } else {
      state.value = { kind: 'remote', uri: result.uri }
    }
  },
  { immediate: true },
)

onBeforeUnmount(release)

// A remote address is shown as a link. The page never loads it, so a model
// cannot make the browser contact a host of its choosing.
const safeRemote = (uri: string) => /^https?:\/\//i.test(uri)
</script>

<template>
  <img
    v-if="state.kind === 'blob'"
    :src="state.url"
    :alt="t('session.image.alt', { number })"
    class="max-h-72 max-w-full rounded-md border object-contain"
  />
  <a
    v-else-if="state.kind === 'remote' && safeRemote(state.uri)"
    :href="state.uri"
    target="_blank"
    rel="noopener noreferrer nofollow"
    class="text-primary text-sm underline underline-offset-2"
  >
    {{ t('session.image.remote') }}
  </a>
  <span v-else-if="state.kind === 'loading'" class="bg-muted inline-block h-16 w-24 animate-pulse rounded-md" />
  <span v-else class="text-muted-foreground text-sm">{{ t('session.image.failed', { number }) }}</span>
</template>
