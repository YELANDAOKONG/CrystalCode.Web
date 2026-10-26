<script setup lang="ts">
// A label and value list used by every report. The label column is aligned
// and the values wrap, so a long path never pushes the layout wider.
defineProps<{ rows: { label: string; value: string; mono?: boolean }[] }>()
</script>

<template>
  <dl class="grid grid-cols-[minmax(7rem,max-content)_1fr] gap-x-4 gap-y-1 text-sm">
    <template v-for="row in rows" :key="row.label">
      <dt class="text-muted-foreground">{{ row.label }}</dt>
      <dd class="min-w-0 break-words tabular-nums" :class="row.mono ? 'font-mono text-xs leading-5' : ''">{{ row.value }}</dd>
    </template>
  </dl>
</template>
