<script setup lang="ts">
import { computed } from 'vue'
import { server } from '@/app/server'
import ConnectView from '@/components/connect/ConnectView.vue'
import SessionView from '@/components/session/SessionView.vue'

const showSession = computed(() => ['live', 'reconnecting', 'closed'].includes(server.phase.value))
</script>

<template>
  <SessionView v-if="showSession" />
  <ConnectView v-else />
</template>
