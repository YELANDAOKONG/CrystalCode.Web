<script setup lang="ts">
import { computed } from 'vue'
import { Moon, Sun, SunMoon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { t } from '@/i18n'
import { useTheme, type ThemeSetting } from '@/theme/theme'

const { theme, setTheme } = useTheme()

// The trigger shows the setting in force, so the icon is a status as well as a button.
const icon = computed(() => (theme.value === 'light' ? Sun : theme.value === 'dark' ? Moon : SunMoon))
const label = computed(() => t(`common.theme.${theme.value}`))
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-10 md:size-9"
        :aria-label="`${t('common.theme')}: ${label}`"
        :title="`${t('common.theme')}: ${label}`"
      >
        <component :is="icon" class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-40">
      <DropdownMenuRadioGroup :model-value="theme" @update:model-value="setTheme($event as ThemeSetting)">
        <DropdownMenuRadioItem value="auto"><SunMoon class="size-4" />{{ t('common.theme.auto') }}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="light"><Sun class="size-4" />{{ t('common.theme.light') }}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark"><Moon class="size-4" />{{ t('common.theme.dark') }}</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
