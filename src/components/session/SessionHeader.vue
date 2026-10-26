<script setup lang="ts">
import { Download, LogOut, PanelRight } from '@lucide/vue'
import { server } from '@/app/server'
import LogoMark from '@/components/common/LogoMark.vue'
import PreferenceMenu from '@/components/common/PreferenceMenu.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { t } from '@/i18n'

defineProps<{ panelOpen: boolean }>()
const emit = defineEmits<{ togglePanel: [] }>()

const model = server.model

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
  <header class="flex h-12 shrink-0 items-center gap-3 border-b px-3">
    <LogoMark class="size-5 shrink-0" />
    <div class="min-w-0 flex-1">
      <div class="truncate font-mono text-xs" :title="model.chrome?.workspace">{{ model.chrome?.workspace }}</div>
      <div v-if="model.chrome" class="text-muted-foreground truncate text-xs">
        {{ model.chrome.model }} · {{ model.chrome.thinking }}
      </div>
    </div>

    <DropdownMenu v-if="server.can('GET /export')">
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon" :aria-label="t('header.export')" :title="t('header.export')">
          <Download class="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem @select="download('markdown')">{{ t('header.export.markdown') }}</DropdownMenuItem>
        <DropdownMenuItem @select="download('json')">{{ t('header.export.json') }}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Button
      variant="ghost"
      size="icon"
      :aria-label="t('header.panel')"
      :aria-pressed="panelOpen"
      :title="t('header.panel')"
      @click="emit('togglePanel')"
    >
      <PanelRight class="size-4" />
    </Button>
    <PreferenceMenu />
    <Button variant="ghost" size="icon" :aria-label="t('header.disconnect')" :title="t('header.disconnect')" @click="server.disconnect()">
      <LogOut class="size-4" />
    </Button>
  </header>
</template>
