<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { t } from '@/i18n'
import type { PursueLimitName } from '@/protocol/types'
import SettingRow from './SettingRow.vue'

const props = defineProps<{
  name: PursueLimitName
  label: string
  help: string
  value: number | null
  minimum: number
  disabled: boolean
  save: (name: PursueLimitName, value: number | null) => Promise<boolean>
}>()
const text = ref('')
const unlimited = ref(false)
const saving = ref(false)
const failed = ref(false)
const saved = ref(false)
const id = computed(() => `pursue-limit-${props.name}`)
const allowsUnlimited = computed(() => props.name !== 'stalls')
watch(() => props.value, (value) => {
  unlimited.value = value === null
  text.value = value === null ? '' : String(value)
}, { immediate: true })
const value = computed(() => unlimited.value && allowsUnlimited.value ? null : Number(text.value))
const valid = computed(() => value.value === null || (text.value.trim() !== '' && Number.isInteger(value.value) && value.value >= props.minimum && value.value <= 2_147_483_647))
const dirty = computed(() => valid.value && value.value !== props.value)
watch([text, unlimited], () => {
  failed.value = false
  saved.value = false
})

async function submit(): Promise<void> {
  if (props.disabled || saving.value || !dirty.value) return
  saving.value = true
  failed.value = false
  saved.value = false
  const ok = await props.save(props.name, value.value)
  failed.value = !ok
  saved.value = ok
  saving.value = false
}
</script>

<template>
  <SettingRow :label="label" :help="help" :label-for="id">
    <form class="flex flex-col gap-2" @submit.prevent="submit">
      <div v-if="allowsUnlimited" class="flex min-h-9 items-center justify-between gap-2">
        <label :for="`${id}-unlimited`" class="text-xs">{{ t('settings.pursue.unlimited') }}</label>
        <Switch :id="`${id}-unlimited`" v-model="unlimited" :disabled="disabled || saving" />
      </div>
      <div class="flex items-center gap-2">
        <Input :id="id" :model-value="text" @update:model-value="(value) => text = String(value)" type="number" inputmode="numeric" :min="minimum" :max="2147483647" step="1" :disabled="disabled || saving || unlimited" :placeholder="unlimited ? t('settings.pursue.unlimited') : undefined" :aria-invalid="!unlimited && !valid || undefined" :aria-describedby="!unlimited && !valid ? `${id}-error` : undefined" class="h-10 sm:h-9" />
        <Button type="submit" variant="outline" size="sm" class="h-10 sm:h-9" :disabled="disabled || saving || !dirty" :aria-busy="saving || undefined">
          <Spinner v-if="saving" class="motion-reduce:animate-none" />{{ t('settings.pursue.save') }}
        </Button>
      </div>
      <p v-if="!unlimited && !valid" :id="`${id}-error`" class="text-destructive text-xs">{{ t('settings.pursue.integer', { minimum }) }}</p>
      <p v-if="failed" role="alert" class="text-destructive text-xs">{{ t('settings.pursue.saveFailed') }}</p>
      <p v-if="saved" role="status" class="text-muted-foreground text-xs">{{ t('settings.saved') }}</p>
    </form>
  </SettingRow>
</template>
