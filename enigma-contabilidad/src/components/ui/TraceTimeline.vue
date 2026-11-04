<script setup lang="ts">
import { Check, CircleAlert } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import type { EstadoPaso, PasoTimeline } from './tipos'

defineProps<{
  pasos: readonly PasoTimeline[]
}>()

function clasePaso(estado: EstadoPaso): string {
  return `ui-timeline__paso ui-timeline__paso--${estado}`
}
</script>

<template>
  <ol class="ui-timeline">
    <li
      v-for="(paso, indice) in pasos"
      :key="`${paso.titulo}-${indice}`"
      :class="clasePaso(paso.estado)"
    >
      <span class="ui-timeline__marca" aria-hidden="true">
        <Check v-if="paso.estado === 'completado'" :size="14" :stroke-width="3" />
        <CircleAlert v-else-if="paso.estado === 'observado'" :size="14" />
        <template v-else>{{ indice + 1 }}</template>
      </span>
      <div class="ui-timeline__contenido">
        <p class="ui-timeline__titulo">
          <RouterLink v-if="paso.to" :to="paso.to">{{ paso.titulo }}</RouterLink>
          <span v-else>{{ paso.titulo }}</span>
          <span v-if="paso.estado === 'actual'" class="ui-badge ui-badge--marca">Etapa actual</span>
          <span v-else-if="paso.estado === 'observado'" class="ui-badge ui-badge--advertencia">
            Observado
          </span>
        </p>
        <p v-if="paso.fecha" class="ui-timeline__meta">{{ paso.fecha }}</p>
        <p v-if="paso.descripcion" class="ui-timeline__descripcion">{{ paso.descripcion }}</p>
      </div>
    </li>
  </ol>
</template>
