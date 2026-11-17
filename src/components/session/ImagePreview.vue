<script setup lang="ts">
import { computed, watch } from 'vue'
import { ChevronLeft, ChevronRight, X } from '@lucide/vue'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { t } from '@/i18n'

export interface PreviewImage {
  src: string
  alt: string
}

// Full-size view of one image from a short list. `index` is the open image, or
// null when closed. Left and Right step through the list.
const props = defineProps<{ items: PreviewImage[] }>()
const index = defineModel<number | null>({ required: true })

const current = computed(() => (index.value === null ? undefined : props.items[index.value]))

// The list can shrink while open, for example when a draft image is removed.
watch(current, (image) => {
  if (index.value !== null && !image) index.value = null
})

function step(by: number): void {
  if (index.value === null || props.items.length < 2) return
  index.value = (index.value + by + props.items.length) % props.items.length
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') step(-1)
  else if (event.key === 'ArrowRight') step(1)
  else return
  event.preventDefault()
}
</script>

<template>
  <Dialog :open="current !== undefined" @update:open="(open) => !open && (index = null)">
    <DialogContent
      :show-close-button="false"
      class="w-auto max-w-[calc(100%-1rem)] gap-0 border-0 bg-transparent p-0 shadow-none sm:max-w-[calc(100%-4rem)]"
      @keydown="onKey"
    >
      <DialogTitle class="sr-only">{{ current?.alt }}</DialogTitle>
      <DialogDescription class="sr-only">{{ t('session.image.preview') }}</DialogDescription>
      <img
        v-if="current"
        :src="current.src"
        :alt="current.alt"
        class="mx-auto max-h-[85dvh] max-w-full rounded-lg object-contain"
      />
      <DialogClose
        class="bg-background text-foreground hover:bg-accent focus-visible:ring-ring absolute top-2 right-2 grid size-9 place-items-center rounded-full border shadow-sm outline-none focus-visible:ring-2"
        :title="t('session.image.close')"
        :aria-label="t('session.image.close')"
      >
        <X class="size-4" />
      </DialogClose>
      <template v-if="items.length > 1">
        <button
          type="button"
          class="bg-background text-foreground hover:bg-accent focus-visible:ring-ring absolute top-1/2 left-2 grid size-9 -translate-y-1/2 place-items-center rounded-full border shadow-sm outline-none focus-visible:ring-2"
          :title="t('session.image.previous')"
          :aria-label="t('session.image.previous')"
          @click="step(-1)"
        >
          <ChevronLeft class="size-4" />
        </button>
        <button
          type="button"
          class="bg-background text-foreground hover:bg-accent focus-visible:ring-ring absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full border shadow-sm outline-none focus-visible:ring-2"
          :title="t('session.image.next')"
          :aria-label="t('session.image.next')"
          @click="step(1)"
        >
          <ChevronRight class="size-4" />
        </button>
      </template>
    </DialogContent>
  </Dialog>
</template>
