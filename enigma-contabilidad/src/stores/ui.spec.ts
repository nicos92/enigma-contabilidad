import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '@/stores/ui'

describe('useUiStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('administra notificaciones con valores por defecto e identificadores únicos', () => {
    const ui = useUiStore()

    const primerId = ui.notificar({ titulo: 'Documento aprobado' })
    const segundoId = ui.notificar({
      tipo: 'error',
      titulo: 'No se pudo guardar',
      mensaje: 'Revisá los datos ingresados.',
      duracion: 8000,
    })

    expect(primerId).not.toBe(segundoId)
    expect(ui.notificaciones).toHaveLength(2)
    expect(ui.notificaciones[0]).toMatchObject({
      id: primerId,
      tipo: 'info',
      titulo: 'Documento aprobado',
      duracion: 5000,
    })
    expect(ui.notificaciones[1]).toMatchObject({
      id: segundoId,
      tipo: 'error',
      mensaje: 'Revisá los datos ingresados.',
      duracion: 8000,
    })
  })

  it('cierra una notificación por id y limpia el resto', () => {
    const ui = useUiStore()
    const primerId = ui.notificar({ titulo: 'Primera' })
    ui.notificar({ titulo: 'Segunda' })

    ui.cerrarNotificacion(primerId)

    expect(ui.notificaciones.map((notificacion) => notificacion.titulo)).toEqual(['Segunda'])

    ui.limpiarNotificaciones()

    expect(ui.notificaciones).toHaveLength(0)
  })

  it('persiste el colapso del sidebar en localStorage', () => {
    const ui = useUiStore()

    expect(ui.sidebarColapsada).toBe(false)

    ui.alternarSidebar()

    expect(ui.sidebarColapsada).toBe(true)
    expect(window.localStorage.getItem('enigma-gestion:ui:sidebar-colapsada')).toBe('1')
  })

  it('restaura el colapso del sidebar al crear el store', () => {
    window.localStorage.setItem('enigma-gestion:ui:sidebar-colapsada', '1')
    setActivePinia(createPinia())

    const ui = useUiStore()

    expect(ui.sidebarColapsada).toBe(true)
  })

  it('abre, alterna y cierra el menú móvil', () => {
    const ui = useUiStore()

    expect(ui.sidebarMovilAbierta).toBe(false)

    ui.abrirMenuMovil()
    expect(ui.sidebarMovilAbierta).toBe(true)

    ui.alternarMenuMovil()
    expect(ui.sidebarMovilAbierta).toBe(false)

    ui.abrirMenuMovil()
    ui.cerrarMenuMovil()
    expect(ui.sidebarMovilAbierta).toBe(false)
  })

  it('activa, alterna y desactiva el modo presentación', () => {
    const ui = useUiStore()

    expect(ui.modoPresentacion).toBe(false)

    ui.activarModoPresentacion()
    expect(ui.modoPresentacion).toBe(true)

    ui.alternarModoPresentacion()
    expect(ui.modoPresentacion).toBe(false)

    ui.abrirMenuMovil()
    ui.activarModoPresentacion()
    expect(ui.sidebarMovilAbierta).toBe(false)

    ui.desactivarModoPresentacion()
    expect(ui.modoPresentacion).toBe(false)
  })
})
