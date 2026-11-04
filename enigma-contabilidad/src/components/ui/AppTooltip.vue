<script setup lang="ts">
defineProps<{
  texto: string
}>()
</script>

<template>
  <span class="ui-tooltip">
    <slot />
    <span class="ui-tooltip__globo" role="tooltip">{{ texto }}</span>
  </span>
</template>
