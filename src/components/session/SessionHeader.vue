<script setup lang="ts">
import { computed } from 'vue'
import { Download, LibraryBig, PanelRight, Settings } from '@lucide/vue'
import { server } from '@/app/server'
import LanguageMenu from '@/components/common/LanguageMenu.vue'
import LogoMark from '@/components/common/LogoMark.vue'
import ThemeMenu from '@/components/common/ThemeMenu.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { t } from '@/i18n'

defineProps<{ panelOpen: boolean }>()
const emit = defineEmits<{ togglePanel: []; openSettings: []; openCatalog: [] }>()

const model = server.model

// The catalog needs at least one of the query routes the server lists.
const hasCatalog = computed(() =>
  ['GET /sessions', 'GET /models', 'GET /agents', 'GET /skills', 'GET /mcp', 'GET /plugins', 'GET /tasks'].some((route) => server.can(route)),
)

async function download(format: 'markdown' | 'json'): Promise<void> {
  const file = await server.exportSession(format, false)
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
  <header class="flex h-12 shrink-0 items-center gap-1 border-b pr-1 pl-3 md:gap-2 md:pr-3">
    <LogoMark class="mr-2 hidden size-5 shrink-0 sm:block" />
    <div class="min-w-0 flex-1">
      <div class="truncate font-mono text-xs" :title="model.chrome?.workspace">{{ model.chrome?.workspace }}</div>
      <div v-if="model.chrome" class="text-muted-foreground truncate text-xs">
        {{ model.chrome.provider }} / {{ model.chrome.model }} · {{ model.chrome.thinking }}
      </div>
    </div>

    <LanguageMenu />
    <ThemeMenu />

    <DropdownMenu v-if="server.can('GET /export')">
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon" class="size-10 md:size-9" :aria-label="t('header.export')" :title="t('header.export')">
          <Download class="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem @select="download('markdown')">{{ t('header.export.markdown') }}</DropdownMenuItem>
        <DropdownMenuItem @select="download('json')">{{ t('header.export.json') }}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Button
      v-if="hasCatalog"
      variant="ghost"
      size="icon"
      class="size-10 md:size-9"
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
  </header>
</template>
