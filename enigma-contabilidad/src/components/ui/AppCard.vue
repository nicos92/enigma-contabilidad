<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    titulo?: string
    descripcion?: string
    compacta?: boolean
    interactiva?: boolean
  }>(),
  {
    compacta: false,
    interactiva: false,
  },
)

const clases = computed(() => [
  'ui-card',
  {
    'ui-card--compacta': props.compacta,
    'ui-card--interactiva': props.interactiva,
  },
])
</script>

<template>
  <section :class="clases">
    <header
      v-if="titulo || descripcion || $slots.encabezado || $slots.acciones"
      class="ui-card__cabecera"
    >
      <div>
        <slot name="encabezado">
          <h3 v-if="titulo" class="ui-card__titulo">{{ titulo }}</h3>
          <p v-if="descripcion" class="ui-card__descripcion">{{ descripcion }}</p>
        </slot>
      </div>
      <div v-if="$slots.acciones" class="ui-card__acciones">
        <slot name="acciones" />
      </div>
    </header>
    <div class="ui-card__cuerpo">
      <slot />
    </div>
    <footer v-if="$slots.pie" class="ui-card__pie">
      <slot name="pie" />
    </footer>
  </section>
</template>
