import { defineStore } from 'pinia'
import { ref } from 'vue'

export type TipoNotificacion = 'exito' | 'error' | 'advertencia' | 'info'

export interface Notificacion {
  id: number
  tipo: TipoNotificacion
  titulo: string
  mensaje?: string
  duracion: number
}

export interface EntradaNotificacion {
  tipo?: TipoNotificacion
  titulo: string
  mensaje?: string
  duracion?: number
}

const CLAVE_SIDEBAR = 'enigma-gestion:ui:sidebar-colapsada'

function leerSidebarColapsada(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_SIDEBAR) === '1'
  } catch {
    return false
  }
}

function guardarSidebarColapsada(valor: boolean): void {
  try {
    window.localStorage.setItem(CLAVE_SIDEBAR, valor ? '1' : '0')
  } catch {
    // El shell sigue funcionando aunque el navegador bloquee localStorage.
  }
}

/**
 * Estado de interfaz compartido por el shell: sidebar y notificaciones.
 * No contiene datos de negocio, que viven en el store de contabilidad.
 */
export const useUiStore = defineStore('ui', () => {
  const sidebarColapsada = ref(leerSidebarColapsada())
  const sidebarMovilAbierta = ref(false)
  const modoPresentacion = ref(false)
  const notificaciones = ref<Notificacion[]>([])
  let siguienteId = 1

  function alternarSidebar(): void {
    sidebarColapsada.value = !sidebarColapsada.value
    guardarSidebarColapsada(sidebarColapsada.value)
  }

  function abrirMenuMovil(): void {
    sidebarMovilAbierta.value = true
  }

  function cerrarMenuMovil(): void {
    sidebarMovilAbierta.value = false
  }

  function alternarMenuMovil(): void {
    sidebarMovilAbierta.value = !sidebarMovilAbierta.value
  }

  function activarModoPresentacion(): void {
    modoPresentacion.value = true
    sidebarMovilAbierta.value = false
  }

  function desactivarModoPresentacion(): void {
    modoPresentacion.value = false
  }

  function alternarModoPresentacion(): void {
    modoPresentacion.value = !modoPresentacion.value
    if (modoPresentacion.value) sidebarMovilAbierta.value = false
  }

  function notificar(entrada: EntradaNotificacion): number {
    const id = siguienteId++
    notificaciones.value.push({
      id,
      tipo: entrada.tipo ?? 'info',
      titulo: entrada.titulo,
      mensaje: entrada.mensaje,
      duracion: entrada.duracion ?? 5000,
    })
    return id
  }

  function cerrarNotificacion(id: number): void {
    notificaciones.value = notificaciones.value.filter((notificacion) => notificacion.id !== id)
  }

  function limpiarNotificaciones(): void {
    notificaciones.value = []
  }

  return {
    sidebarColapsada,
    sidebarMovilAbierta,
    modoPresentacion,
    notificaciones,
    alternarSidebar,
    abrirMenuMovil,
    cerrarMenuMovil,
    alternarMenuMovil,
    activarModoPresentacion,
    desactivarModoPresentacion,
    alternarModoPresentacion,
    notificar,
    cerrarNotificacion,
    limpiarNotificaciones,
  }
})
