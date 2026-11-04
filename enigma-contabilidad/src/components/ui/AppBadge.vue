<script setup lang="ts">
import { computed } from 'vue'
import type { TipoBadge } from './tipos'

const props = withDefaults(
  defineProps<{
    tipo?: TipoBadge
    punto?: boolean
  }>(),
  {
    tipo: 'neutral',
    punto: false,
  },
)

const clases = computed(() => [
  'ui-badge',
  `ui-badge--${props.tipo}`,
  { 'ui-badge--con-punto': props.punto },
])
</script>

<template>
  <span :class="clases">
    <span v-if="punto" class="ui-badge__punto" aria-hidden="true" />
    <slot />
  </span>
</template>
