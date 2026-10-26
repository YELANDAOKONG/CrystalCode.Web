<script setup lang="ts">
import { computed } from 'vue'
import { Languages } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { t, useLocale, type Locale } from '@/i18n'

const { locale, setLocale, locales } = useLocale()
const current = computed(() => locales.find((item) => item.id === locale.value)?.label ?? '')
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-10 md:size-9"
        :aria-label="`${t('common.language')}: ${current}`"
        :title="`${t('common.language')}: ${current}`"
      >
        <Languages class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-40">
      <DropdownMenuRadioGroup :model-value="locale" @update:model-value="setLocale($event as Locale)">
        <DropdownMenuRadioItem v-for="item in locales" :key="item.id" :value="item.id" :lang="item.htmlLang">
          {{ item.label }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
