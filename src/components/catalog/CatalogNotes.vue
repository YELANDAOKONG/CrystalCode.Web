<script setup lang="ts">
// Notes the server attaches to a catalog. Shown as received.
defineProps<{ notes: string[] }>()
</script>

<template>
  <ul v-if="notes.length" class="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
    <li v-for="(note, index) in notes" :key="index" class="break-words">{{ note }}</li>
  </ul>
</template>
