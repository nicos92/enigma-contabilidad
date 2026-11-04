import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Estado global mínimo del shell. Los datos de negocio se incorporan en F2.
 */
export const useAppStore = defineStore('app', () => {
  const nombreEmpresa = ref('Enigma Solutions')
  const nombreProducto = ref('Enigma Gestión')
  const periodo = ref('Noviembre 2026')
  const usuario = ref({
    nombre: 'Lucía Fernández',
    rol: 'Administración',
  })

  return {
    nombreEmpresa,
    nombreProducto,
    periodo,
    usuario,
  }
})
