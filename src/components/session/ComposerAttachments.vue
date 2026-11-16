<script setup lang="ts">
import { RotateCw, TriangleAlert, X } from '@lucide/vue'
import { Spinner } from '@/components/ui/spinner'
import { t } from '@/i18n'
import type { Attachment } from '@/session/attachment'

// Thumbnails of the images in the draft, above the text box. The marker in the
// text is what the server reads; this strip shows what it stands for.
defineProps<{ items: Attachment[]; disabled: boolean }>()
const emit = defineEmits<{ remove: [id: number]; retry: [id: number] }>()

const label = (item: Attachment) => (item.status === 'ready' ? t('session.image.alt', { number: item.number }) : item.name)
</script>

<template>
  <ul v-if="items.length" class="flex gap-2 overflow-x-auto px-3 pt-3 pb-1" :aria-label="t('composer.attach.list')">
    <li v-for="item in items" :key="item.id" class="relative shrink-0" :title="label(item)">
      <img
        :src="item.preview"
        :alt="label(item)"
        class="bg-muted size-16 rounded-lg border object-cover"
        :class="item.status !== 'ready' && 'opacity-50'"
        draggable="false"
      />
      <span
        v-if="item.status === 'uploading'"
        role="status"
        class="absolute inset-0 grid place-items-center rounded-lg"
      >
        <Spinner class="size-5 motion-reduce:animate-none" />
        <span class="sr-only">{{ t('composer.attach.uploading', { name: item.name }) }}</span>
      </span>
      <span v-else-if="item.status === 'failed'" role="alert" class="absolute inset-0 grid place-items-center rounded-lg">
        <span class="sr-only">{{ t('composer.attach.failed') }}</span>
        <button
          type="button"
          class="text-destructive hover:bg-accent focus-visible:ring-ring grid size-9 place-items-center rounded-full outline-none focus-visible:ring-2 disabled:pointer-events-none"
          :disabled="disabled"
          :title="t('composer.attach.retry')"
          :aria-label="t('composer.attach.retryNamed', { name: item.name })"
          @click="emit('retry', item.id)"
        >
          <RotateCw class="size-4" />
        </button>
      </span>
      <TriangleAlert v-if="item.status === 'failed'" class="text-destructive bg-background absolute -bottom-1 -left-1 size-4 rounded-full" aria-hidden="true" />
      <button
        type="button"
        class="bg-background text-foreground hover:bg-accent focus-visible:ring-ring absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border shadow-sm outline-none focus-visible:ring-2 md:size-6"
        :disabled="disabled"
        :title="t('composer.attach.remove')"
        :aria-label="t('composer.attach.removeNamed', { name: label(item) })"
        @click="emit('remove', item.id)"
      >
        <X class="size-3.5" />
      </button>
    </li>
  </ul>
</template>
