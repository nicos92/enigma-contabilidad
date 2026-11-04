<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
import EmptyState from './EmptyState.vue'
import type { ColumnaTabla } from './tipos'

withDefaults(
  defineProps<{
    columnas: readonly ColumnaTabla[]
    filas: readonly Record<string, unknown>[]
    claveFila?: string
    titulo?: string
    cargando?: boolean
    compacta?: boolean
    vacioTitulo?: string
    vacioMensaje?: string
  }>(),
  {
    claveFila: 'id',
    cargando: false,
    compacta: false,
    vacioTitulo: 'Sin resultados',
    vacioMensaje: 'No hay datos para mostrar con los filtros actuales.',
  },
)

function claveDeFila(fila: Record<string, unknown>, indice: number, claveFila: string): string {
  const valor = fila[claveFila]
  return typeof valor === 'string' || typeof valor === 'number' ? String(valor) : String(indice)
}

function valorVisible(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  return String(valor)
}

function claseAlineacion(alineacion?: ColumnaTabla['alineacion']): string {
  if (alineacion === 'derecha') return 'ui-tabla__celda--derecha'
  if (alineacion === 'centro') return 'ui-tabla__celda--centro'
  return ''
}
</script>

<template>
  <div class="ui-tabla-contenedor">
    <table class="ui-tabla" :class="{ 'ui-tabla--compacta': compacta }">
      <caption v-if="titulo" class="sr-only">
        {{
          titulo
        }}
      </caption>
      <thead>
        <tr>
          <th
            v-for="columna in columnas"
            :key="columna.clave"
            scope="col"
            :class="claseAlineacion(columna.alineacion)"
            :style="columna.ancho ? { width: columna.ancho } : undefined"
          >
            {{ columna.titulo }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="cargando">
          <td :colspan="columnas.length" class="ui-tabla__vacio">
            <span class="ui-tabla__cargando">
              <RefreshCw :size="16" class="ui-button__spinner" aria-hidden="true" />
              Cargando datos…
            </span>
          </td>
        </tr>
        <tr v-else-if="filas.length === 0">
          <td :colspan="columnas.length" class="ui-tabla__vacio">
            <EmptyState :titulo="vacioTitulo" :mensaje="vacioMensaje" compacto />
          </td>
        </tr>
        <template v-else>
          <tr v-for="(fila, indice) in filas" :key="claveDeFila(fila, indice, claveFila)">
            <td
              v-for="columna in columnas"
              :key="columna.clave"
              :class="claseAlineacion(columna.alineacion)"
            >
              <slot
                :name="`celda-${columna.clave}`"
                :fila="fila"
                :columna="columna"
                :valor="fila[columna.clave]"
                :indice="indice"
              >
                {{ valorVisible(fila[columna.clave]) }}
              </slot>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
