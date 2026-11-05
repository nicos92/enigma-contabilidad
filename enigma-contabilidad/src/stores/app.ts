import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useContabilidadStore } from '@/stores/contabilidad'

/**
 * Estado global mínimo del shell. Los datos de negocio viven en el store de
 * contabilidad; el usuario se lee desde allí para que Configuración pueda
 * modificarlo y conservarlo entre recargas.
 */
export const useAppStore = defineStore('app', () => {
  const contabilidad = useContabilidadStore()

  const nombreEmpresa = ref('Enigma Solutions')
  const nombreProducto = ref('Enigma Gestión')
  const periodo = ref('Noviembre 2026')
  const usuario = computed(() => contabilidad.estado.usuario)

  return {
    nombreEmpresa,
    nombreProducto,
    periodo,
    usuario,
  }
})
