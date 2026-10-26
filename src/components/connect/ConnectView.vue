<script setup lang="ts">
import { computed, ref } from 'vue'
import { Eye, EyeOff, X } from '@lucide/vue'
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

const address = ref(server.savedServers.value[0]?.url ?? '')
const token = ref('')
const showToken = ref(false)
const keepToken = ref(false)
const remember = ref(true)
const space = ref<'unknown' | 'local' | 'loopback'>('unknown')

const busy = computed(() => server.phase.value === 'connecting')
const addressError = computed(() => {
  const failure = server.formError.value
  return failure ? t(`address.${failure.error}` as MessageKey) : null
})
const origin = window.location.origin
// Shown while the operator types, so a blocked mix is known before the first try.
const advisory = computed(() => (address.value.trim() === '' ? null : inspectAddress(address.value).advisory))

function submit(): void {
  void server.connect({
    input: address.value,
    token: token.value,
    keepTokenInTab: keepToken.value,
    remember: remember.value,
    addressSpace: space.value === 'unknown' ? null : space.value,
  })
}

function pick(url: string): void {
  address.value = url
  const saved = server.savedServers.value.find((item) => item.url === url)
  space.value = saved?.addressSpace ?? 'unknown'
}
</script>

<template>
  <div class="flex min-h-full flex-col">
    <header class="flex items-center justify-between px-6 py-4">
      <div class="flex items-center gap-2">
        <LogoMark />
        <span class="text-sm font-medium tracking-wide">{{ t('app.name') }}</span>
      </div>
      <div class="flex items-center">
        <LanguageMenu />
        <ThemeMenu />
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-6 pb-16">
      <div class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight">{{ t('connect.title') }}</h1>
        <p class="text-muted-foreground text-sm">{{ t('connect.lead') }}</p>
      </div>

      <form class="space-y-5" novalidate @submit.prevent="submit">
        <div class="space-y-2">
          <Label for="address">{{ t('connect.address') }}</Label>
          <Input
            id="address"
            v-model="address"
            class="font-mono"
            inputmode="url"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="192.168.1.20:7788"
            :aria-invalid="addressError !== null"
            :aria-describedby="addressError ? 'address-error' : 'address-hint'"
          />
          <p v-if="addressError" id="address-error" class="text-destructive text-sm" role="alert">
            {{ addressError }}
          </p>
          <p v-else id="address-hint" class="text-muted-foreground text-xs">{{ t('connect.address.hint') }}</p>
        </div>

        <div class="space-y-2">
          <Label for="token">{{ t('connect.token') }}</Label>
          <div class="relative">
            <Input
              id="token"
              v-model="token"
              class="pr-10 font-mono"
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
              class="absolute top-0 right-0 size-9"
              :aria-label="showToken ? t('common.hide') : t('common.show')"
              :aria-pressed="showToken"
              @click="showToken = !showToken"
            >
              <EyeOff v-if="showToken" class="size-4" />
              <Eye v-else class="size-4" />
            </Button>
          </div>
          <p id="token-hint" class="text-muted-foreground text-xs">{{ t('connect.token.hint') }}</p>
        </div>

        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <Checkbox id="keep-token" v-model="keepToken" />
            <Label for="keep-token" class="font-normal">{{ t('connect.keepToken') }}</Label>
          </div>
          <div class="flex items-center gap-2">
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

        <Button type="submit" class="w-full" :disabled="busy">
          <Spinner v-if="busy" />
          {{ busy ? t('connect.connecting') : t('connect.submit') }}
        </Button>
      </form>

      <section v-if="server.savedServers.value.length > 0" class="space-y-2" aria-labelledby="saved-title">
        <h2 id="saved-title" class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {{ t('connect.saved') }}
        </h2>
        <ul class="divide-y rounded-lg border">
          <li v-for="item in server.savedServers.value" :key="item.url" class="flex items-center">
            <button
              type="button"
              class="hover:bg-accent min-w-0 flex-1 truncate px-3 py-2 text-left font-mono text-sm"
              @click="pick(item.url)"
            >
              {{ item.url }}
            </button>
            <Button
              variant="ghost"
              size="icon"
              class="size-8"
              :aria-label="t('connect.forget', { address: item.url })"
              @click="server.forget(item.url)"
            >
              <X class="size-4" />
            </Button>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>
