<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    pagina: number
    totalPaginas: number
    totalRegistros?: number
    etiquetaRegistros?: string
  }>(),
  {
    etiquetaRegistros: 'registros',
  },
)

const emit = defineEmits<{
  'update:pagina': [pagina: number]
}>()

function rango(inicio: number, fin: number): number[] {
  return Array.from({ length: Math.max(0, fin - inicio + 1) }, (_, indice) => inicio + indice)
}

const paginas = computed<Array<number | 'separador'>>(() => {
  const total = Math.max(1, props.totalPaginas)
  const actual = Math.min(Math.max(1, props.pagina), total)

  if (total <= 7) return rango(1, total)

  const numeros = new Set<number>([1, total, actual - 1, actual, actual + 1])
  const ordenados = [...numeros]
    .filter((numero) => numero >= 1 && numero <= total)
    .sort((a, b) => a - b)

  const resultado: Array<number | 'separador'> = []
  let anterior = 0
  for (const numero of ordenados) {
    if (anterior && numero - anterior > 1) resultado.push('separador')
    resultado.push(numero)
    anterior = numero
  }
  return resultado
})

const resumen = computed(() => {
  if (props.totalRegistros === undefined) {
    return `Página ${props.pagina} de ${props.totalPaginas}`
  }
  return `${props.totalRegistros} ${props.etiquetaRegistros} · Página ${props.pagina} de ${props.totalPaginas}`
})

function irA(pagina: number): void {
  if (pagina < 1 || pagina > props.totalPaginas || pagina === props.pagina) return
  emit('update:pagina', pagina)
}
</script>

<template>
  <nav class="ui-paginacion" aria-label="Paginación">
    <span class="ui-paginacion__resumen">{{ resumen }}</span>
    <div class="ui-paginacion__controles">
      <button
        type="button"
        class="ui-paginacion__boton"
        aria-label="Página anterior"
        :disabled="pagina <= 1"
        @click="irA(pagina - 1)"
      >
        <ChevronLeft :size="16" aria-hidden="true" />
      </button>
      <template v-for="(item, indice) in paginas" :key="`${item}-${indice}`">
        <span v-if="item === 'separador'" class="ui-paginacion__puntos" aria-hidden="true">
          …
        </span>
        <button
          v-else
          type="button"
          class="ui-paginacion__boton"
          :aria-current="item === pagina ? 'page' : undefined"
          :aria-label="`Ir a la página ${item}`"
          @click="irA(item)"
        >
          {{ item }}
        </button>
      </template>
      <button
        type="button"
        class="ui-paginacion__boton"
        aria-label="Página siguiente"
        :disabled="pagina >= totalPaginas"
        @click="irA(pagina + 1)"
      >
        <ChevronRight :size="16" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>
