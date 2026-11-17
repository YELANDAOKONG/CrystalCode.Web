<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { server } from '@/app/server'
import { t } from '@/i18n'

// `thumb` draws a fixed square crop. Either way a loaded image is a button that
// asks the parent to open the full view.
const props = defineProps<{ number: number; thumb?: boolean }>()
const emit = defineEmits<{ loaded: [number: number, url: string | null]; open: [number: number] }>()

type Loaded = { kind: 'blob'; url: string } | { kind: 'remote'; uri: string } | { kind: 'failed' } | { kind: 'loading' }

const state = ref<Loaded>({ kind: 'loading' })
let objectUrl: string | null = null

function release(): void {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
}

watch(
  () => props.number,
  async (number, previous) => {
    release()
    if (previous !== undefined) emit('loaded', previous, null)
    state.value = { kind: 'loading' }
    const result = await server.loadImage(number)
    if (number !== props.number) return
    if (!result) {
      state.value = { kind: 'failed' }
    } else if ('blob' in result) {
      objectUrl = URL.createObjectURL(result.blob)
      state.value = { kind: 'blob', url: objectUrl }
      emit('loaded', number, objectUrl)
    } else {
      state.value = { kind: 'remote', uri: result.uri }
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  release()
  emit('loaded', props.number, null)
})

// A remote address is shown as a link. The page never loads it, so a model
// cannot make the browser contact a host of its choosing.
const safeRemote = (uri: string) => /^https?:\/\//i.test(uri)
</script>

<template>
  <button
    v-if="state.kind === 'blob'"
    type="button"
    class="focus-visible:ring-ring cursor-zoom-in rounded-md outline-none focus-visible:ring-2"
    :title="t('session.image.open', { number })"
    :aria-label="t('session.image.open', { number })"
    @click="emit('open', number)"
  >
    <img
      :src="state.url"
      :alt="t('session.image.alt', { number })"
      class="rounded-md border"
      :class="thumb ? 'size-20 object-cover sm:size-24' : 'max-h-72 max-w-full object-contain'"
    />
  </button>
  <a
    v-else-if="state.kind === 'remote' && safeRemote(state.uri)"
    :href="state.uri"
    target="_blank"
    rel="noopener noreferrer nofollow"
    class="text-primary text-sm underline underline-offset-2"
  >
    {{ t('session.image.remote') }}
  </a>
  <span
    v-else-if="state.kind === 'loading'"
    class="bg-muted inline-block animate-pulse rounded-md"
    :class="thumb ? 'size-20 sm:size-24' : 'h-16 w-24'"
  />
  <span v-else class="text-muted-foreground text-sm">{{ t('session.image.failed', { number }) }}</span>
</template>
