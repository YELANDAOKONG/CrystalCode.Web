<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Check, Copy, Trash2 } from '@lucide/vue'
import { server } from '@/app/server'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { t, type MessageKey } from '@/i18n'
import type { IssuedToken, Scope } from '@/protocol/types'

const { isAdmin, info } = server

const tokens = ref<IssuedToken[]>([])
const loaded = ref(false)
const label = ref('')
const scope = ref<Scope>('observe')
const created = ref<IssuedToken | null>(null)
const copied = ref(false)
const confirmStop = ref(false)

const authOn = () => info.value?.authentication !== false

async function refresh(): Promise<void> {
  if (!isAdmin.value || !authOn()) return
  tokens.value = (await server.listTokens()) ?? tokens.value
  loaded.value = true
}

onMounted(refresh)

async function issue(): Promise<void> {
  const result = await server.issueToken(scope.value, label.value.trim() === '' ? null : label.value.trim())
  if (!result) return
  created.value = result
  copied.value = false
  label.value = ''
  await refresh()
}

async function revoke(id: string): Promise<void> {
  await server.revokeToken(id)
  if (created.value?.id === id) created.value = null
  await refresh()
}

async function copy(): Promise<void> {
  if (!created.value?.token) return
  try {
    await navigator.clipboard.writeText(created.value.token)
    copied.value = true
  } catch {
    // The token stays selectable in the box if the clipboard is blocked.
  }
}
</script>

<template>
  <section aria-labelledby="admin-title" class="space-y-4">
    <div>
      <h2 id="admin-title" class="text-sm font-medium">{{ t('admin.title') }}</h2>
      <p class="text-muted-foreground mt-0.5 text-xs">{{ t('admin.scope', { scope: server.scope.value }) }}</p>
    </div>

    <p v-if="!isAdmin" class="text-muted-foreground text-sm">{{ t('admin.needsAdmin') }}</p>

    <template v-else>
      <div class="space-y-3">
        <h3 class="text-sm font-medium">{{ t('admin.tokens') }}</h3>
        <p v-if="!authOn()" class="text-muted-foreground text-sm">{{ t('admin.tokens.off') }}</p>
        <template v-else>
          <p class="text-muted-foreground text-xs">{{ t('admin.tokens.lead') }}</p>

          <p v-if="loaded && tokens.length === 0" class="text-muted-foreground text-sm">{{ t('admin.tokens.none') }}</p>
          <ul v-else class="divide-y rounded-md border">
            <li v-for="token in tokens" :key="token.id" class="flex items-center gap-2 px-3 py-2 text-sm">
              <span class="min-w-0 flex-1 truncate">{{ token.label || t('admin.tokens.unnamed') }}</span>
              <Badge variant="outline">{{ token.scope }}</Badge>
              <Button
                variant="ghost"
                size="icon"
                class="size-8"
                :aria-label="t('admin.tokens.revoke.label', { name: token.label || token.id })"
                @click="revoke(token.id)"
              >
                <Trash2 class="size-4" />
              </Button>
            </li>
          </ul>
          <p class="text-muted-foreground text-xs">{{ t('admin.tokens.startup') }}</p>

          <form class="space-y-3 rounded-md border p-3" @submit.prevent="issue">
            <div class="space-y-1.5">
              <Label for="token-label">{{ t('admin.tokens.label') }}</Label>
              <Input id="token-label" v-model="label" autocomplete="off" />
            </div>
            <fieldset class="space-y-1.5">
              <legend class="text-sm font-medium">{{ t('admin.tokens.scope') }}</legend>
              <label v-for="option in (['observe', 'operate', 'admin'] as const)" :key="option" class="flex items-start gap-2 text-sm">
                <input v-model="scope" type="radio" name="token-scope" :value="option" class="accent-primary mt-1" />
                <span>{{ t(`admin.tokens.scope.${option}` as MessageKey) }}</span>
              </label>
            </fieldset>
            <Button type="submit" size="sm">{{ t('admin.tokens.issue') }}</Button>
          </form>

          <div v-if="created?.token" class="space-y-2 rounded-md border border-dashed p-3" role="status">
            <p class="text-sm font-medium">{{ t('admin.tokens.created') }}</p>
            <div class="flex items-center gap-2">
              <Input :model-value="created.token" readonly class="font-mono text-xs" aria-label="Token" @focus="($event.target as HTMLInputElement).select()" />
              <Button type="button" variant="outline" size="icon" :aria-label="t('common.copy')" @click="copy">
                <Check v-if="copied" class="size-4" />
                <Copy v-else class="size-4" />
              </Button>
            </div>
          </div>
        </template>
      </div>

      <div class="space-y-2">
        <h3 class="text-sm font-medium">{{ t('admin.shutdown') }}</h3>
        <p class="text-muted-foreground text-xs">{{ t('admin.shutdown.lead') }}</p>
        <Button variant="destructive" size="sm" @click="confirmStop = true">{{ t('admin.shutdown') }}</Button>
      </div>
    </template>

    <AlertDialog v-model:open="confirmStop">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('admin.shutdown.confirm') }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t('admin.shutdown.confirm.body') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" @click="server.shutdown()">
            {{ t('admin.shutdown.do') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
