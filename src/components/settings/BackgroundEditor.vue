<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ImagePlus, RotateCcw } from '@lucide/vue'
import { t, type MessageKey } from '@/i18n'
import { useAppearance, type BackgroundSlot } from '@/theme/appearance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SettingRow from './SettingRow.vue'

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
        <Button type="button" variant="ghost" size="icon" :aria-label="t('settings.background.clear')" :title="t('settings.background.clear')" @click="clear"><RotateCcw class="size-4" /></Button>
      </div>
    </div>
    <div class="flex flex-col gap-2 sm:flex-row">
      <Input :id="urlId" v-model="url" type="url" inputmode="url" autocomplete="off" :placeholder="t('settings.background.urlPlaceholder')" @keydown.enter.prevent="applyUrl" />
      <Button type="button" variant="secondary" class="sm:shrink-0" @click="applyUrl">{{ t('settings.background.apply') }}</Button>
    </div>
    <p v-if="error" class="text-destructive text-xs" role="alert">{{ error }}</p>
    <p v-else-if="background.source === 'url'" class="text-muted-foreground text-xs">{{ t('settings.background.urlNotice') }}</p>
    <SettingRow :label="t('settings.background.blur')" :help="t('settings.background.blur.help')">
      <div class="flex items-center gap-3">
        <input type="range" class="accent-primary w-full" :value="background.blur" min="0" max="24" step="1" :aria-label="`${t(TITLES[which])}: ${t('settings.background.blur')}`" @input="appearance.setBackground(which, { blur: Number(($event.target as HTMLInputElement).value) })">
        <output class="w-10 text-right text-xs tabular-nums">{{ background.blur }}px</output>
      </div>
    </SettingRow>
  </div>
</template>
