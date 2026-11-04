<script setup lang="ts">
import { Boxes } from '@lucide/vue'

withDefaults(
  defineProps<{
    titulo?: string
    mensaje?: string
    compacto?: boolean
  }>(),
  {
    titulo: 'Sin datos',
    mensaje: 'Todavía no hay información para mostrar.',
    compacto: false,
  },
)
</script>

<template>
  <div class="ui-empty" :class="{ 'ui-empty--compacto': compacto }">
    <span class="ui-empty__icono" aria-hidden="true">
      <slot name="icono">
        <Boxes :size="24" />
      </slot>
    </span>
    <p class="ui-empty__titulo">{{ titulo }}</p>
    <p class="ui-empty__mensaje">{{ mensaje }}</p>
    <div v-if="$slots.acciones" class="ui-empty__acciones">
      <slot name="acciones" />
    </div>
  </div>
</template>
