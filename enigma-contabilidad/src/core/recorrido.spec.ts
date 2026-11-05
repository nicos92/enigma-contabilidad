import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { construirRecorrido } from '@/core/recorrido'
import { useContabilidadStore } from '@/stores/contabilidad'

function iniciarStore() {
  localStorage.clear()
  setActivePinia(createPinia())
  return useContabilidadStore()
}

describe('recorrido guiado', () => {
  beforeEach(() => {
    iniciarStore()
  })

  it('arma los 13 pasos del criterio de aceptación en orden', () => {
    const store = iniciarStore()
    const pasos = construirRecorrido(store.estado)

    expect(pasos).toHaveLength(13)
    expect(pasos.map((paso) => paso.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
    expect(pasos.map((paso) => paso.clave)).toEqual([
      'dashboard',
      'registrar-compra',
      'factura-recibida',
      'pago-proveedor',
      'contaduria',
      'revisar-documentacion',
      'aprobar-asiento',
      'libro-diario',
      'libro-mayor',
      'balance-comprobacion',
      'registrar-venta',
      'cobro-cliente',
      'comprobar-contabilidad',
    ])
    expect(pasos.every((paso) => Boolean(paso.destino.path))).toBe(true)
  })

  it('enlaza la compra, su pago y su circuito contable por defecto', () => {
    const store = iniciarStore()
    const pasos = construirRecorrido(store.estado)

    expect(pasos[1]?.destino).toEqual({ path: '/compras', query: { vista: 'nueva' } })
    expect(pasos[2]?.destino).toEqual({
      path: '/compras',
      query: { operacion: 'C-001', tab: 'factura' },
    })
    expect(pasos[3]?.destino.query).toEqual({ vista: 'pagos', pago: 'P-001' })
    expect(pasos[5]?.destino.query).toEqual({
      vista: 'bandeja',
      documento: 'doc-compra-C-001',
    })
    expect(pasos[6]?.destino.query).toEqual({
      vista: 'asientos',
      asiento: 'asiento-compra-C-001',
    })
    expect(pasos[7]?.destino.query).toEqual({ vista: 'diario', asiento: 'asiento-compra-C-001' })
    expect(pasos[8]?.destino.path).toBe('/libros')
    expect(pasos[8]?.destino.query?.vista).toBe('mayor')
    expect(pasos[8]?.destino.query?.cuenta).toBeTruthy()
    expect(pasos[9]?.destino).toMatchObject({ path: '/balances' })
    expect(pasos[9]?.destino.query?.vista).toBe('comprobacion')
  })

  it('enlaza la venta y su cobro en los últimos pasos', () => {
    const store = iniciarStore()
    const pasos = construirRecorrido(store.estado)

    expect(pasos[10]?.destino).toEqual({ path: '/ventas', query: { vista: 'nueva' } })
    expect(pasos[11]?.destino.query).toEqual({ vista: 'cobros', cobro: 'K-001' })
    expect(pasos[12]?.destino).toMatchObject({ path: '/balances' })
    expect(pasos[12]?.destino.query?.cuenta).toBeTruthy()
  })

  it('respeta las operaciones seleccionadas para la presentación', () => {
    const store = iniciarStore()
    const pasos = construirRecorrido(store.estado, { compraId: 'C-002', ventaId: 'V-002' })

    expect(pasos[2]?.destino.query).toMatchObject({ operacion: 'C-002' })
    expect(pasos[3]?.destino.query).toMatchObject({ pago: 'P-002' })
    expect(pasos[11]?.destino.query).toMatchObject({ cobro: 'K-002' })
  })

  it('vuelve a la operación demo si el identificador no existe', () => {
    const store = iniciarStore()
    const pasos = construirRecorrido(store.estado, {
      compraId: 'C-999',
      ventaId: 'V-999',
    })

    expect(pasos[2]?.destino.query).toMatchObject({ operacion: 'C-001' })
    expect(pasos[11]?.destino.query).toMatchObject({ cobro: 'K-001' })
  })
})
