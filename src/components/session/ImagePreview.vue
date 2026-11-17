<script setup lang="ts">
import { computed, watch } from 'vue'
import { ChevronLeft, ChevronRight, X } from '@lucide/vue'
import { DialogContent, DialogPortal } from 'reka-ui'
import { Dialog, DialogClose, DialogDescription, DialogOverlay, DialogTitle } from '@/components/ui/dialog'
import { t } from '@/i18n'

export interface PreviewImage {
  src: string
  alt: string
}

// Full-size view of one image from a short list. `index` is the open image, or
// null when closed. Left and Right step through the list. The controls are
// fixed to the screen edges, so they do not move with the image size.
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

const control =
  'fixed z-50 grid size-10 place-items-center rounded-full bg-white/15 text-white outline-none backdrop-blur-sm transition-colors hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white'
</script>

<template>
  <Dialog :open="current !== undefined" @update:open="(open) => !open && (index = null)">
    <DialogPortal>
      <DialogOverlay />
      <!-- No transform on this box, so the fixed controls below are placed against the screen. -->
      <DialogContent
        class="fixed inset-0 z-50 flex items-center justify-center px-16 py-16 outline-none"
        @keydown="onKey"
        @click.self="index = null"
      >
        <DialogTitle class="sr-only">{{ current?.alt }}</DialogTitle>
        <DialogDescription class="sr-only">{{ t('session.image.preview') }}</DialogDescription>
        <img
          v-if="current"
          :src="current.src"
          :alt="current.alt"
          class="max-h-full max-w-full rounded-lg object-contain"
        />
        <DialogClose :class="[control, 'top-4 right-4']" :aria-label="t('session.image.close')">
          <X class="size-5" />
        </DialogClose>
        <template v-if="items.length > 1">
          <button
            type="button"
            :class="[control, 'top-1/2 left-4 -translate-y-1/2']"
            :aria-label="t('session.image.previous')"
            @click="step(-1)"
          >
            <ChevronLeft class="size-5" />
          </button>
          <button
            type="button"
            :class="[control, 'top-1/2 right-4 -translate-y-1/2']"
            :aria-label="t('session.image.next')"
            @click="step(1)"
          >
            <ChevronRight class="size-5" />
          </button>
        </template>
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
