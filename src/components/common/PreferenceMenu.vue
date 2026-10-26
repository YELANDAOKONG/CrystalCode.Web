<script setup lang="ts">
import { Languages, Moon, Sun, SunMoon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { t, useLocale, type Locale } from '@/i18n'
import { useTheme, type ThemeSetting } from '@/theme/theme'

const { locale, setLocale, locales } = useLocale()
const { theme, setTheme } = useTheme()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" :aria-label="`${t('common.language')} / ${t('common.theme')}`">
        <Languages class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-48">
      <DropdownMenuLabel>{{ t('common.language') }}</DropdownMenuLabel>
      <DropdownMenuRadioGroup :model-value="locale" @update:model-value="setLocale($event as Locale)">
        <DropdownMenuRadioItem v-for="item in locales" :key="item.id" :value="item.id">
          {{ item.label }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>{{ t('common.theme') }}</DropdownMenuLabel>
      <DropdownMenuRadioGroup :model-value="theme" @update:model-value="setTheme($event as ThemeSetting)">
        <DropdownMenuRadioItem value="auto"><SunMoon class="size-4" />{{ t('common.theme.auto') }}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="light"><Sun class="size-4" />{{ t('common.theme.light') }}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark"><Moon class="size-4" />{{ t('common.theme.dark') }}</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
