<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, Ellipsis, LibraryBig, PanelRight, Settings } from '@lucide/vue'
import { server } from '@/app/server'
import LanguageMenu from '@/components/common/LanguageMenu.vue'
import LogoMark from '@/components/common/LogoMark.vue'
import ThemeMenu from '@/components/common/ThemeMenu.vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHeaderTitleSetting } from '@/composables/header-title'
import { t, useLocale, type Locale } from '@/i18n'
import { useTheme, type ThemeSetting } from '@/theme/theme'

defineProps<{ panelOpen: boolean }>()
const emit = defineEmits<{ togglePanel: []; openSettings: []; openCatalog: [] }>()

const { locale, setLocale, locales } = useLocale()
const { theme, setTheme } = useTheme()
const model = server.model
const { headerTitle } = useHeaderTitleSetting()

// The catalog needs at least one of the query routes the server lists.
const hasCatalog = computed(() =>
  ['GET /sessions', 'GET /models', 'GET /agents', 'GET /skills', 'GET /mcp', 'GET /plugins', 'GET /tasks'].some((route) => server.can(route)),
)

const exporting = ref(false)

async function download(format: 'markdown' | 'json'): Promise<void> {
  if (exporting.value) return
  exporting.value = true
  const file = await server.exportSession(format, false).finally(() => (exporting.value = false))
  if (!file) return
  const url = URL.createObjectURL(file.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.fileName ?? `crystal-code.${format === 'json' ? 'json' : 'md'}`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <header class="acrylic-panel flex h-12 shrink-0 items-center gap-1 border-b pr-1 pl-3 md:gap-2 md:pr-3">
    <LogoMark class="mr-2 hidden size-5 shrink-0 sm:block" />
    <div class="min-w-0 flex-1">
      <!-- The topic is the server's text, shown as received and only as text.
           With a topic the header keeps two lines, so the workspace moves to the tooltip. -->
      <template v-if="model.chrome?.topic && headerTitle === 'topic'">
        <div class="truncate text-sm leading-5 font-medium" :title="`${model.chrome.topic}\n${model.chrome.workspace}`">{{ model.chrome.topic }}</div>
        <div class="text-muted-foreground truncate text-xs leading-4" :title="model.chrome.workspace">
          {{ model.chrome.provider }} / {{ model.chrome.model }} · {{ model.chrome.thinking }}
        </div>
      </template>
      <template v-else>
        <div class="truncate font-mono text-xs" :title="model.chrome?.workspace">{{ model.chrome?.workspace }}</div>
        <div v-if="model.chrome" class="text-muted-foreground truncate text-xs">
          {{ model.chrome.provider }} / {{ model.chrome.model }} · {{ model.chrome.thinking }}
        </div>
      </template>
    </div>

    <div class="hidden items-center md:flex">
      <LanguageMenu />
      <ThemeMenu />
    </div>

    <DropdownMenu v-if="server.can('GET /export')">
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon" class="hidden size-10 md:inline-flex md:size-9" :aria-label="t('header.export')" :title="t('header.export')">
          <Spinner v-if="exporting" class="size-4 motion-reduce:animate-none" />
          <Download v-else class="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem @select="download('markdown')">{{ t('header.export.markdown') }}</DropdownMenuItem>
          <DropdownMenuItem @select="download('json')">{{ t('header.export.json') }}</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>

    <Button
      v-if="hasCatalog"
      variant="ghost"
      size="icon"
      class="hidden size-10 md:inline-flex md:size-9"
      :aria-label="t('header.catalog')"
      :title="t('header.catalog')"
      @click="emit('openCatalog')"
    >
      <LibraryBig class="size-4" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      class="size-10 md:size-9"
      :aria-label="t('header.panel')"
      :aria-pressed="panelOpen"
      :title="t('header.panel')"
      @click="emit('togglePanel')"
    >
      <PanelRight class="size-4" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      class="size-10 md:size-9"
      :aria-label="t('header.settings')"
      :title="t('header.settings')"
      @click="emit('openSettings')"
    >
      <Settings class="size-4" />
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon" class="size-10 md:hidden" :aria-label="t('common.more')" :title="t('common.more')">
          <Ellipsis class="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem v-if="hasCatalog" @select="emit('openCatalog')"><LibraryBig class="size-4" />{{ t('header.catalog') }}</DropdownMenuItem>
          <DropdownMenuSub v-if="server.can('GET /export')">
            <DropdownMenuSubTrigger><Download class="size-4" />{{ t('header.export') }}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuGroup>
                <DropdownMenuItem :disabled="exporting" @select="download('markdown')">{{ t('header.export.markdown') }}</DropdownMenuItem>
                <DropdownMenuItem :disabled="exporting" @select="download('json')">{{ t('header.export.json') }}</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator v-if="hasCatalog || server.can('GET /export')" />
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{{ t('common.language') }}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup :model-value="locale" @update:model-value="setLocale($event as Locale)">
                <DropdownMenuRadioItem v-for="item in locales" :key="item.id" :value="item.id" :lang="item.htmlLang">{{ item.label }}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{{ t('common.theme') }}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup :model-value="theme" @update:model-value="setTheme($event as ThemeSetting)">
                <DropdownMenuRadioItem v-for="value in ['auto', 'light', 'dark'] as const" :key="value" :value="value">{{ t(`common.theme.${value}`) }}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </header>
</template>
