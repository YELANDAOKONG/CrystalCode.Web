<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Check, Clipboard, Eye, EyeOff, X } from '@lucide/vue'
import LogoMark from '@/components/common/LogoMark.vue'
import LanguageMenu from '@/components/common/LanguageMenu.vue'
import ThemeMenu from '@/components/common/ThemeMenu.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { server } from '@/app/server'
import { inspectAddress } from '@/connection/page'
import { t, type MessageKey } from '@/i18n'
import AdvisoryNotice from './AdvisoryNotice.vue'
import DiagnosisPanel from './DiagnosisPanel.vue'

const host = server.hosted.value
const address = ref(host?.url ?? server.savedServers.value[0]?.url ?? '')
const token = ref('')
const showToken = ref(false)
// A hosting server fixes the address. A token is asked for only when it is
// needed: the server said so, or it answered 401 although it said not.
const tokenNeeded = computed(
  () => host === null || host.authentication || server.diagnosis.value?.code === 'unauthorized',
)
const keepToken = ref(false)
const remember = ref(true)
const space = ref<'unknown' | 'local' | 'loopback'>('unknown')

const busy = computed(() => server.phase.value === 'connecting')
const addressError = computed(() => {
  const failure = server.formError.value
  return failure ? t(`address.${failure.error}` as MessageKey) : null
})
const origin = window.location.origin
// A hosting server fixes the address, so the only thing left to do after a
// failure is to try again, or to type the token it asked for.
const retrying = computed(() => host !== null && !tokenNeeded.value && server.diagnosis.value !== null)
const serverCommand = `crystal server --allow-origin '${origin}'`
const commandCopied = ref(false)
let copyReset: ReturnType<typeof setTimeout> | undefined
watch(
  tokenNeeded,
  async (needed) => {
    if (!needed || host === null) return
    await nextTick()
    document.getElementById('token')?.focus()
  },
  { immediate: true, flush: 'post' },
)
// Shown while the operator types, so a blocked mix is known before the first try.
const advisory = computed(() =>
  host !== null || address.value.trim() === '' ? null : inspectAddress(address.value).advisory,
)

function submit(): void {
  void server.connect({
    input: address.value,
    token: token.value,
    keepTokenInTab: keepToken.value,
    remember: host === null && remember.value,
    addressSpace: space.value === 'unknown' ? null : space.value,
  })
}

function pick(url: string): void {
  address.value = url
  const saved = server.savedServers.value.find((item) => item.url === url)
  space.value = saved?.addressSpace ?? 'unknown'
}

async function copyServerCommand(): Promise<void> {
  try {
    await navigator.clipboard.writeText(serverCommand)
    commandCopied.value = true
    clearTimeout(copyReset)
    copyReset = setTimeout(() => (commandCopied.value = false), 2000)
  } catch {
    commandCopied.value = false
  }
}
</script>

<template>
  <div class="connect-page flex min-h-full flex-col">
    <header class="connect-header flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <LogoMark />
        <span class="text-[15px] font-semibold">{{ t('app.name') }}</span>
      </div>
      <div class="flex items-center gap-1">
        <LanguageMenu />
        <ThemeMenu />
      </div>
    </header>

    <main class="connect-layout mx-auto grid w-full flex-1">
      <section class="connect-intro">
        <div class="connect-title-row flex items-center gap-4">
          <LogoMark class="connect-large-mark shrink-0" />
          <h1 class="text-[2.5rem] leading-[1.08] font-semibold">{{ t('connect.title') }}</h1>
        </div>
        <p class="connect-lead text-muted-foreground text-base leading-7">
          {{ host ? t('connect.lead.hosted') : t('connect.lead') }}
        </p>

        <div v-if="host === null" class="server-command">
          <h2 class="text-sm font-semibold">{{ t('connect.serverCommand.title') }}</h2>
          <p class="text-muted-foreground mt-1 text-sm leading-6">{{ t('connect.serverCommand.hint') }}</p>
          <div class="command-line mt-4 flex items-center gap-3">
            <code class="min-w-0 flex-1 break-all font-mono text-[13px] leading-6">{{ serverCommand }}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-9 shrink-0"
              :aria-label="commandCopied ? t('connect.serverCommand.copied') : t('connect.serverCommand.copy')"
              :title="commandCopied ? t('connect.serverCommand.copied') : t('connect.serverCommand.copy')"
              @click="copyServerCommand"
            >
              <Check v-if="commandCopied" class="size-4" />
              <Clipboard v-else class="size-4" />
            </Button>
          </div>
          <p class="text-muted-foreground mt-3 text-xs leading-5">{{ t('connect.serverCommand.origin', { origin }) }}</p>
        </div>
      </section>

      <section class="connect-workspace" :aria-label="t('connect.title')">
        <div v-if="host && busy && !server.diagnosis.value" class="connecting-state flex items-center gap-3" role="status">
          <Spinner />
          <span>{{ t('connect.connecting') }}</span>
        </div>
        <form v-else class="connect-form" novalidate @submit.prevent="submit">
          <div v-if="host === null" class="field-block">
            <Label for="address">{{ t('connect.address') }}</Label>
            <Input
              id="address"
              v-model="address"
              class="mt-2 font-mono"
              inputmode="url"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              placeholder="192.168.1.20:7788"
              :aria-invalid="addressError !== null"
              :aria-describedby="addressError ? 'address-error' : 'address-hint'"
            />
            <p v-if="addressError" id="address-error" class="text-destructive mt-2 text-sm" role="alert">
              {{ addressError }}
            </p>
            <p v-else id="address-hint" class="text-muted-foreground mt-2 text-xs leading-5">{{ t('connect.address.hint') }}</p>
          </div>

          <div v-if="tokenNeeded" class="field-block">
            <Label for="token">{{ t('connect.token') }}</Label>
            <div class="relative mt-2">
              <Input
                id="token"
                v-model="token"
                class="h-11 pr-11 font-mono"
                :type="showToken ? 'text' : 'password'"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                aria-describedby="token-hint"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="absolute top-1 right-1 size-9"
                :aria-label="showToken ? t('common.hide') : t('common.show')"
                :aria-pressed="showToken"
                @click="showToken = !showToken"
              >
                <EyeOff v-if="showToken" class="size-4" />
                <Eye v-else class="size-4" />
              </Button>
            </div>
            <p id="token-hint" class="text-muted-foreground mt-2 text-xs leading-5">{{ host ? t('connect.token.required') : t('connect.token.hint') }}</p>
          </div>

          <div v-if="tokenNeeded || host === null" class="preferences">
            <div v-if="tokenNeeded" class="flex items-center gap-2.5">
              <Checkbox id="keep-token" v-model="keepToken" />
              <Label for="keep-token" class="font-normal">{{ t('connect.keepToken') }}</Label>
            </div>
            <div v-if="host === null" class="flex items-center gap-2.5">
              <Checkbox id="remember" v-model="remember" />
              <Label for="remember" class="font-normal">{{ t('connect.remember') }}</Label>
            </div>
          </div>

          <AdvisoryNotice v-if="advisory" :advisory="advisory" />

          <fieldset v-if="advisory?.canDeclareAddressSpace" class="space-y-2">
            <legend class="text-sm font-medium">{{ t('connect.space.title') }}</legend>
            <p class="text-muted-foreground text-xs">{{ t('connect.space.lead') }}</p>
            <RadioGroup v-model="space" class="gap-2">
              <div v-for="option in ['unknown', 'local', 'loopback'] as const" :key="option" class="flex items-center gap-2">
                <RadioGroupItem :id="`space-${option}`" :value="option" />
                <Label :for="`space-${option}`" class="font-normal">
                  {{ t(`connect.space.${option}` as MessageKey) }}
                </Label>
              </div>
            </RadioGroup>
          </fieldset>

          <DiagnosisPanel v-if="server.diagnosis.value" :diagnosis="server.diagnosis.value" :origin="origin" />

          <Button type="submit" class="connect-submit h-11 w-full text-[15px]" :disabled="busy">
            <Spinner v-if="busy" />
            {{ busy ? t('connect.connecting') : retrying ? t('connect.retry') : t('connect.submit') }}
          </Button>
        </form>

        <section v-if="host === null && server.savedServers.value.length > 0" class="saved-servers" aria-labelledby="saved-title">
          <h2 id="saved-title" class="text-sm font-semibold">{{ t('connect.saved') }}</h2>
          <ul class="mt-2">
            <li v-for="item in server.savedServers.value" :key="item.url" class="saved-server flex items-center gap-2">
              <button type="button" class="hover:text-foreground min-w-0 flex-1 truncate text-left font-mono text-sm" @click="pick(item.url)">
                {{ item.url }}
              </button>
              <Button
                variant="ghost"
                size="icon"
                class="size-9 shrink-0"
                :aria-label="t('connect.forget', { address: item.url })"
                @click="server.forget(item.url)"
              >
                <X class="size-4" />
              </Button>
            </li>
          </ul>
        </section>
      </section>
    </main>
  </div>
</template>

<style scoped>
.connect-page {
  background: var(--site-bg);
}

.connect-header {
  position: sticky;
  top: 0;
  z-index: 20;
  min-height: 4.25rem;
  padding-inline: clamp(1.25rem, 4vw, 3.5rem);
  background: var(--site-bg);
}

.connect-layout {
  max-width: 75rem;
  grid-template-columns: minmax(0, 0.9fr) minmax(26rem, 1fr);
  gap: clamp(3rem, 8vw, 8rem);
  padding: 3.5rem clamp(1.25rem, 4vw, 3.5rem) 5rem;
}

.connect-intro {
  position: sticky;
  top: max(1.5rem, calc((100dvh - 18rem) / 2));
  max-width: 33rem;
  align-self: start;
  margin-block: 1.5rem;
}

.connect-large-mark {
  width: 3.25rem;
  height: 3.25rem;
  color: var(--site-accent);
}

.connect-title-row h1 {
  text-wrap: balance;
}

.connect-lead {
  max-width: 31rem;
  margin-top: 1.5rem;
}

.server-command {
  max-width: 31rem;
  margin-top: 3.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--site-line-strong);
}

.command-line {
  min-height: 3.5rem;
  padding: 0.5rem 0.5rem 0.5rem 0.875rem;
  border-radius: var(--radius);
  background: var(--site-raised);
  color: var(--site-ink);
}

.command-line code {
  overflow-wrap: anywhere;
}

.connect-workspace {
  min-width: 0;
  padding: clamp(1.5rem, 3.5vw, 2.75rem);
  border: 1px solid var(--site-line);
  border-radius: calc(var(--radius) + 0.25rem);
  background: var(--site-surface);
}

.connect-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.field-block label {
  font-size: 0.875rem;
  font-weight: 550;
}

.field-block > [data-slot='input'] {
  height: 2.875rem;
}

.preferences {
  display: grid;
  gap: 0.875rem;
  padding-block: 0.125rem;
}

.preferences label {
  cursor: pointer;
}

.connect-submit {
  margin-top: 0.125rem;
}

.saved-servers {
  margin-top: 1.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--site-line);
}

.saved-server {
  min-height: 2.875rem;
  color: var(--site-muted);
}

.connecting-state {
  min-height: 8rem;
  justify-content: center;
}

@media (max-width: 800px) {
  .connect-layout {
    max-width: 38rem;
    grid-template-columns: minmax(0, 1fr);
    align-content: center;
    gap: 2.5rem;
    padding-top: 2rem;
    padding-bottom: 3rem;
  }

  .connect-intro {
    position: static;
    max-width: none;
    margin-block: 0;
  }

  .connect-title-row h1 {
    font-size: 2rem;
  }

  .connect-lead {
    margin-top: 1rem;
  }

  .server-command {
    display: none;
  }
}

@media (max-width: 420px) {
  .connect-layout {
    gap: 1.75rem;
    padding-inline: 1rem;
    padding-top: 1.5rem;
  }

  .connect-header {
    padding-inline: 1rem;
  }

  .connect-large-mark {
    width: 2.5rem;
    height: 2.5rem;
  }

  .connect-title-row h1 {
    font-size: 1.75rem;
  }

  .connect-workspace {
    padding: 1.25rem;
  }
}
</style>
