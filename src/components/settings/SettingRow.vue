<script setup lang="ts">
// One setting: a name and what it does on the left, its control on the right.
// On a narrow screen the control drops under the text and takes the full width,
// so a select is always large enough to tap.
defineProps<{ label: string; help?: string; labelFor?: string; note?: string }>()
</script>

<template>
  <div class="grid gap-2 py-3 sm:grid-cols-[1fr_minmax(10rem,14rem)] sm:items-center sm:gap-6">
    <div class="min-w-0">
      <label :for="labelFor" class="text-sm font-medium">{{ label }}</label>
      <p v-if="help" class="text-muted-foreground mt-0.5 text-xs leading-snug">{{ help }}</p>
      <p v-if="note" class="text-muted-foreground mt-0.5 text-xs leading-snug">{{ note }}</p>
    </div>
    <div class="min-w-0 sm:justify-self-end sm:w-full"><slot /></div>
  </div>
</template>
