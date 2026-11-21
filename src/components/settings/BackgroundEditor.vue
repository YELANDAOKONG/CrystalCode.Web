<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ImageOff, ImagePlus, RotateCcw } from '@lucide/vue'
import { t, type MessageKey } from '@/i18n'
import { useAppearance, type BackgroundSlot } from '@/theme/appearance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RangeSetting from './RangeSetting.vue'

const props = defineProps<{ which: BackgroundSlot }>()

const TITLES: Record<BackgroundSlot, MessageKey> = {
  shared: 'settings.background.image',
  light: 'settings.background.light',
  dark: 'settings.background.dark',
}

const appearance = useAppearance()
const background = computed(() => appearance.slots[props.which].value)
const url = ref(background.value.source === 'url' ? background.value.value : '')
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const urlId = `background-url-${props.which}`
const image = computed(() => appearance.imageOf(props.which))
// Long names are cut in the middle so a file's extension stays visible. The
// full text is in the title attribute.
function shorten(text: string, max: number): string {
  if (text.length <= max) return text
  const extension = /\.[^./\\]{1,8}$/.exec(text)?.[0] ?? ''
  const head = max - extension.length - 1
  return head > 8 ? `${text.slice(0, head)}…${extension}` : `${text.slice(0, max - 1)}…`
}

const source = computed(() => background.value.source === 'file' ? background.value.name : background.value.value)
const status = computed(() => {
  if (background.value.source === 'file') return t('settings.background.file', { name: shorten(source.value, 40) })
  if (background.value.source === 'url') return t('settings.background.url', { url: shorten(source.value, 60) })
  return t('settings.background.none')
})

watch(background, (value) => { url.value = value.source === 'url' ? value.value : '' })

function applyUrl(): void {
  try {
    const parsed = new URL(url.value)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('invalid')
    error.value = appearance.setBackground(props.which, { source: 'url', value: parsed.href }) ? '' : t('settings.background.notSaved')
  } catch {
    error.value = t('settings.background.invalidUrl')
  }
}

async function readFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    error.value = await appearance.setFile(props.which, file) ? '' : t('settings.background.fileRejected')
  } catch {
    error.value = t('settings.background.fileRejected')
  }
  input.value = ''
}

function clear(): void {
  appearance.clearBackground(props.which)
  error.value = ''
}
</script>

<template>
  <div class="space-y-3 border-b py-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <Label :for="urlId" class="text-sm font-medium">{{ t(TITLES[which]) }}</Label>
      <div class="flex gap-2">
        <input ref="fileInput" class="sr-only" type="file" accept="image/*" tabindex="-1" @change="readFile">
        <Button type="button" variant="outline" size="sm" @click="fileInput?.click()"><ImagePlus class="size-4" />{{ t('settings.background.upload') }}</Button>
        <Button type="button" variant="ghost" size="icon" :disabled="background.source === 'none'" :aria-label="t('settings.background.clear')" :title="t('settings.background.clear')" @click="clear"><RotateCcw class="size-4" /></Button>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <div class="bg-muted flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border" :class="!image && 'border-dashed'">
        <img v-if="image" :src="image" alt="" class="size-full object-cover">
        <ImageOff v-else class="text-muted-foreground size-5" aria-hidden="true" />
      </div>
      <p class="text-muted-foreground min-w-0 text-xs break-all" role="status" :title="source || undefined">{{ status }}</p>
    </div>
    <div class="flex flex-col gap-2 sm:flex-row">
      <Input :id="urlId" v-model="url" type="url" inputmode="url" autocomplete="off" :placeholder="t('settings.background.urlPlaceholder')" @keydown.enter.prevent="applyUrl" />
      <Button type="button" variant="secondary" class="sm:shrink-0" @click="applyUrl">{{ t('settings.background.apply') }}</Button>
    </div>
    <p v-if="error" class="text-destructive text-xs" role="alert">{{ error }}</p>
    <p v-else-if="background.source === 'url'" class="text-muted-foreground text-xs">{{ t('settings.background.urlNotice') }}</p>
    <RangeSetting :label="t('settings.background.blur')" :help="t('settings.background.blur.help')" :aria-label="`${t(TITLES[which])}: ${t('settings.background.blur')}`" :model-value="background.blur" :default-value="0" :min="0" :max="24" unit="px" @update:model-value="(blur) => appearance.setBackground(which, { blur })" />
  </div>
</template>
