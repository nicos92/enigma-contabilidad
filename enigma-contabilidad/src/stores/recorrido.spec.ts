import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useRecorridoStore } from '@/stores/recorrido'

function iniciarStore() {
  localStorage.clear()
  setActivePinia(createPinia())
  return useRecorridoStore()
}

describe('useRecorridoStore', () => {
  beforeEach(() => {
    iniciarStore()
  })

  it('abre el recorrido en el primer paso y calcula su progreso', () => {
    const recorrido = iniciarStore()

    expect(recorrido.abierto).toBe(false)

    recorrido.abrir()

    expect(recorrido.abierto).toBe(true)
    expect(recorrido.total).toBe(13)
    expect(recorrido.indice).toBe(0)
    expect(recorrido.numeroPaso).toBe(1)
    expect(recorrido.pasoActual?.clave).toBe('dashboard')
    expect(recorrido.porcentaje).toBe(8)
    expect(recorrido.esPrimerPaso).toBe(true)
    expect(recorrido.esUltimoPaso).toBe(false)
  })

  it('navega hacia adelante y atrás sin salir de los límites', () => {
    const recorrido = iniciarStore()
    recorrido.abrir()

    recorrido.anterior()
    expect(recorrido.indice).toBe(0)

    recorrido.siguiente()
    expect(recorrido.numeroPaso).toBe(2)
    expect(recorrido.pasoActual?.clave).toBe('registrar-compra')

    recorrido.irAPaso(13)
    expect(recorrido.esUltimoPaso).toBe(true)
    expect(recorrido.pasoActual?.clave).toBe('comprobar-contabilidad')

    recorrido.siguiente()
    expect(recorrido.numeroPaso).toBe(13)

    recorrido.irAPaso(99)
    expect(recorrido.numeroPaso).toBe(13)

    recorrido.irAPaso(0)
    expect(recorrido.numeroPaso).toBe(1)
  })

  it('abre directamente en el paso indicado y conserva las operaciones elegidas', () => {
    const recorrido = iniciarStore()

    recorrido.abrir({ indice: 9, compraId: 'C-002', ventaId: 'V-002' })

    expect(recorrido.numeroPaso).toBe(10)
    expect(recorrido.pasoActual?.clave).toBe('balance-comprobacion')
    expect(recorrido.compraId).toBe('C-002')
    expect(recorrido.ventaId).toBe('V-002')
    expect(recorrido.pasos[2]?.destino.query).toMatchObject({ operacion: 'C-002' })
    expect(recorrido.pasos[11]?.destino.query).toMatchObject({ cobro: 'K-002' })
  })

  it('permite cambiar una operación sin reiniciar el paso actual', () => {
    const recorrido = iniciarStore()
    recorrido.abrir({ indice: 3 })

    recorrido.usarOperacion('compra', 'C-003')
    recorrido.usarOperacion('venta', 'V-003')

    expect(recorrido.numeroPaso).toBe(4)
    expect(recorrido.pasos[3]?.destino.query).toMatchObject({ pago: 'P-003' })
    expect(recorrido.pasos[11]?.destino.query).toMatchObject({ cobro: 'K-003' })
  })

  it('cierra el recorrido sin perder las operaciones seleccionadas', () => {
    const recorrido = iniciarStore()
    recorrido.abrir({ compraId: 'C-004' })

    recorrido.cerrar()

    expect(recorrido.abierto).toBe(false)
    expect(recorrido.compraId).toBe('C-004')
  })
})
