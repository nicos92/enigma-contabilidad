import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { construirRecorrido, type PasoRecorridoGuiado } from '@/core/recorrido'
import type { TipoOperacionTrazabilidad } from '@/core/trazabilidad'
import { useContabilidadStore } from '@/stores/contabilidad'

export interface AperturaRecorrido {
  indice?: number
  compraId?: string | null
  ventaId?: string | null
}

function acotarIndice(indice: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(Math.max(indice, 0), total - 1)
}

/**
 * Estado del recorrido guiado global. Vive fuera de la pantalla de trazabilidad
 * para que la barra de pasos sobreviva a la navegación entre módulos.
 */
export const useRecorridoStore = defineStore('recorrido', () => {
  const contabilidad = useContabilidadStore()

  const abierto = ref(false)
  const indice = ref(0)
  const compraId = ref<string | null>(null)
  const ventaId = ref<string | null>(null)

  const pasos = computed<PasoRecorridoGuiado[]>(() =>
    construirRecorrido(contabilidad.estado, {
      compraId: compraId.value,
      ventaId: ventaId.value,
    }),
  )

  const total = computed(() => pasos.value.length)
  const pasoActual = computed<PasoRecorridoGuiado | null>(() => pasos.value[indice.value] ?? null)
  const numeroPaso = computed(() => (pasoActual.value ? indice.value + 1 : 0))
  const esPrimerPaso = computed(() => indice.value <= 0)
  const esUltimoPaso = computed(() => indice.value >= total.value - 1)
  const porcentaje = computed(() =>
    total.value > 0 ? Math.round(((indice.value + 1) / total.value) * 100) : 0,
  )

  function abrir(opciones: AperturaRecorrido = {}): void {
    if (opciones.compraId !== undefined) compraId.value = opciones.compraId
    if (opciones.ventaId !== undefined) ventaId.value = opciones.ventaId
    indice.value = acotarIndice(opciones.indice ?? 0, total.value)
    abierto.value = true
  }

  function cerrar(): void {
    abierto.value = false
  }

  function irAPaso(numero: number): void {
    indice.value = acotarIndice(numero - 1, total.value)
  }

  function siguiente(): void {
    if (esUltimoPaso.value) return
    indice.value += 1
  }

  function anterior(): void {
    if (esPrimerPaso.value) return
    indice.value -= 1
  }

  function usarOperacion(tipo: TipoOperacionTrazabilidad, id: string | null): void {
    if (tipo === 'compra') compraId.value = id
    else ventaId.value = id
  }

  return {
    abierto,
    indice,
    compraId,
    ventaId,
    pasos,
    total,
    pasoActual,
    numeroPaso,
    esPrimerPaso,
    esUltimoPaso,
    porcentaje,
    abrir,
    cerrar,
    irAPaso,
    siguiente,
    anterior,
    usarOperacion,
  }
})
