<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
import { computed } from 'vue'
import type { TamanoBoton, VarianteBoton } from './tipos'

const props = withDefaults(
  defineProps<{
    variante?: VarianteBoton
    tamano?: TamanoBoton
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    cargando?: boolean
    bloque?: boolean
    soloIcono?: boolean
  }>(),
  {
    variante: 'primario',
    tamano: 'md',
    type: 'button',
    disabled: false,
    cargando: false,
    bloque: false,
    soloIcono: false,
  },
)

const clases = computed(() => [
  'ui-button',
  `ui-button--${props.variante}`,
  props.tamano !== 'md' ? `ui-button--${props.tamano}` : '',
  {
    'ui-button--bloque': props.bloque,
    'ui-button--icono': props.soloIcono,
  },
])
</script>

<template>
  <button
    :type="type"
    :class="clases"
    :disabled="disabled || cargando"
    :aria-busy="cargando ? 'true' : undefined"
  >
    <RefreshCw
      v-if="cargando"
      class="ui-button__spinner"
      :size="soloIcono ? 16 : 15"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
