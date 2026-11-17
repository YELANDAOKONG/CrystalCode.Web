<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { t } from '@/i18n'
import ImagePreview from './ImagePreview.vue'
import ServerImage from './ServerImage.vue'

// The server images of one message or tool result, with a shared full view.
// Only images that have loaded can be opened, so the full view steps through
// those.
const props = defineProps<{ numbers: number[]; thumb?: boolean }>()

const urls = reactive<Record<number, string>>({})
const open = ref<number | null>(null)

const loaded = computed(() => props.numbers.filter((number) => urls[number]))
const items = computed(() => loaded.value.map((number) => ({ src: urls[number]!, alt: t('session.image.alt', { number }) })))

function track(number: number, url: string | null): void {
  if (url) urls[number] = url
  else delete urls[number]
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <ServerImage
      v-for="number in numbers"
      :key="number"
      :number="number"
      :thumb="thumb"
      @loaded="track"
      @open="(picked) => (open = loaded.indexOf(picked))"
    />
    <ImagePreview v-model="open" :items="items" />
  </div>
</template>
