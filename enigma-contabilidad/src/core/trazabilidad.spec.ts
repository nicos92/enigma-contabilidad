import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  construirTrazabilidad,
  cuentaPrincipalDeOperacion,
  listarOperacionesTrazables,
} from '@/core/trazabilidad'
import { useContabilidadStore } from '@/stores/contabilidad'

function iniciarStore() {
  localStorage.clear()
  setActivePinia(createPinia())
  return useContabilidadStore()
}

const CLAVES_ETAPAS = [
  'origen',
  'documento',
  'tesoreria',
  'contaduria',
  'autorizacion',
  'asiento',
  'diario',
  'mayor',
  'balance',
] as const

describe('trazabilidad', () => {
  beforeEach(() => {
    iniciarStore()
  })

  it('construye las nueve etapas de una compra desde el origen hasta el balance', () => {
    const store = iniciarStore()
    const trazabilidad = construirTrazabilidad(store.estado, 'compra', 'C-001')

    expect(trazabilidad).not.toBeNull()
    expect(trazabilidad?.tipo).toBe('compra')
    expect(trazabilidad?.id).toBe('C-001')
    expect(trazabilidad?.numero).toBe('FC-A-0001-00000101')
    expect(trazabilidad?.etapas.map((etapa) => etapa.clave)).toEqual([...CLAVES_ETAPAS])
    expect(trazabilidad?.etapas).toHaveLength(9)
    expect(trazabilidad?.comprobantesTesoreria).toBe(1)
    expect(trazabilidad?.saldoPendiente).toBeGreaterThan(0)
    expect(trazabilidad?.resumen).toMatchObject({
      completadas: 8,
      total: 9,
      porcentaje: 89,
      estado: 'en_curso',
    })
    expect(trazabilidad?.etapas.find((etapa) => etapa.clave === 'tesoreria')?.estado).toBe('actual')
  })

  it('enlaza cada etapa con la pantalla donde ocurre y conserva fechas y referencias', () => {
    const store = iniciarStore()
    const trazabilidad = construirTrazabilidad(store.estado, 'compra', 'C-001')!

    for (const etapa of trazabilidad.etapas) {
      expect(etapa.destino.path).toBeTruthy()
      expect(etapa.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(etapa.referencia).toBeTruthy()
    }

    expect(trazabilidad.etapas.find((etapa) => etapa.clave === 'documento')?.destino).toMatchObject(
      {
        path: '/compras',
        query: { operacion: 'C-001', tab: 'factura' },
      },
    )
    expect(trazabilidad.etapas.find((etapa) => etapa.clave === 'asiento')?.destino.query).toEqual({
      vista: 'asientos',
      asiento: trazabilidad.asiento?.id,
    })
    expect(trazabilidad.etapas.find((etapa) => etapa.clave === 'tesoreria')?.destino.query).toEqual(
      {
        vista: 'pagos',
        pago: 'P-001',
      },
    )
    expect(trazabilidad.etapas.find((etapa) => etapa.clave === 'balance')?.destino.query).toEqual({
      vista: 'comprobacion',
      cuenta: trazabilidad.cuentaPrincipal,
    })
  })

  it('sigue una venta, su factura, su asiento y su cobro parcial', () => {
    const store = iniciarStore()
    const trazabilidad = construirTrazabilidad(store.estado, 'venta', 'V-001')

    expect(trazabilidad).not.toBeNull()
    expect(trazabilidad?.tipo).toBe('venta')
    expect(trazabilidad?.documento.origen).toBe('ventas')
    expect(trazabilidad?.comprobantesTesoreria).toBe(1)
    expect(trazabilidad?.etapas.find((etapa) => etapa.clave === 'documento')?.titulo).toBe(
      'Factura emitida',
    )
    expect(
      trazabilidad?.etapas.find((etapa) => etapa.clave === 'tesoreria')?.destino.query,
    ).toEqual({
      vista: 'cobros',
      cobro: 'K-001',
    })
    expect(trazabilidad?.etapas.find((etapa) => etapa.clave === 'tesoreria')?.estado).toBe('actual')
  })

  it('marca las etapas pendientes de una operación todavía no registrada', () => {
    const store = iniciarStore()
    const trazabilidad = construirTrazabilidad(store.estado, 'compra', 'C-008')!

    expect(trazabilidad.documento.estado).not.toBe('registrado')
    expect(trazabilidad.asiento?.estado).toBe('propuesto')
    expect(trazabilidad.resumen.estado).toBe('en_curso')
    expect(trazabilidad.resumen.completadas).toBeLessThan(8)
    expect(trazabilidad.etapas.find((etapa) => etapa.clave === 'autorizacion')?.estado).toBe(
      'actual',
    )
    expect(trazabilidad.etapas.find((etapa) => etapa.clave === 'tesoreria')?.estado).toBe(
      'pendiente',
    )
  })

  it('lista las operaciones trazables de cada tipo en orden cronológico descendente', () => {
    const store = iniciarStore()
    const compras = listarOperacionesTrazables(store.estado, 'compra')
    const ventas = listarOperacionesTrazables(store.estado, 'venta')

    expect(compras).toHaveLength(store.estado.compras.length)
    expect(ventas).toHaveLength(store.estado.ventas.length)

    for (let indice = 1; indice < compras.length; indice += 1) {
      expect(compras[indice - 1]!.fecha >= compras[indice]!.fecha).toBe(true)
    }

    expect(compras.find((operacion) => operacion.id === 'C-001')).toMatchObject({
      tipo: 'compra',
      numero: 'FC-A-0001-00000101',
      estadoComercial: 'Parcial',
    })
    expect(ventas.find((operacion) => operacion.id === 'V-001')).toMatchObject({
      tipo: 'venta',
      numero: 'FA-A-0001-00000201',
      estadoComercial: 'Parcial',
    })
  })

  it('obtiene la cuenta principal del asiento para enlazar Mayor y Balance', () => {
    const store = iniciarStore()

    const cuentaCompra = cuentaPrincipalDeOperacion(store.estado, 'compra', 'C-001')
    const cuentaVenta = cuentaPrincipalDeOperacion(store.estado, 'venta', 'V-001')

    expect(cuentaCompra).toBe(
      store.estado.asientos.find((asiento) => asiento.id === 'asiento-compra-C-001')?.lineas[0]
        ?.cuentaId,
    )
    expect(cuentaVenta).toBe(
      store.estado.asientos.find((asiento) => asiento.id === 'asiento-venta-V-001')?.lineas[0]
        ?.cuentaId,
    )
    expect(cuentaPrincipalDeOperacion(store.estado, 'compra', 'C-999')).toBeNull()
  })

  it('hace recorrer las nueve etapas a una compra nueva hasta completar el circuito', () => {
    const store = iniciarStore()
    const proveedor = store.estado.proveedores[0]!
    const producto = store.estado.productos.find((actual) => actual.tipo === 'producto')!

    const alta = store.registrarCompra({
      proveedor,
      fecha: '2026-11-28',
      vencimiento: '2026-12-28',
      tipoComprobante: 'Factura A',
      condicionPago: 'cuenta_corriente',
      items: [
        {
          productoId: producto.id,
          descripcion: producto.nombre,
          cantidad: 1,
          precioUnitario: producto.costo,
          alicuotaIva: producto.alicuotaIva,
          cuentaContable: producto.cuentaCompra,
        },
      ],
    })

    expect(alta.ok).toBe(true)
    const compra = alta.compra!
    const documento = alta.documento!

    const inicial = construirTrazabilidad(store.estado, 'compra', compra.id)!
    expect(inicial.etapas).toHaveLength(9)
    expect(inicial.documento.id).toBe(documento.id)
    expect(inicial.etapas.find((etapa) => etapa.clave === 'autorizacion')?.estado).toBe('actual')
    expect(inicial.etapas.find((etapa) => etapa.clave === 'tesoreria')?.estado).toBe('pendiente')

    expect(store.aprobarDocumento(documento.id)).toMatchObject({ ok: true })

    const pago = store.registrarPago({
      compra,
      proveedor,
      fecha: '2026-11-29',
      importe: compra.total,
      medio: 'banco',
    })
    expect(pago.ok).toBe(true)
    expect(pago.documento).toBeDefined()
    expect(store.aprobarDocumento(pago.documento!.id)).toMatchObject({ ok: true })

    const completa = construirTrazabilidad(store.estado, 'compra', compra.id)!
    expect(completa.etapas).toHaveLength(9)
    expect(completa.saldoPendiente).toBe(0)
    expect(completa.resumen).toMatchObject({
      completadas: 9,
      total: 9,
      porcentaje: 100,
      estado: 'completada',
    })
    expect(completa.etapas.every((etapa) => etapa.estado === 'completado')).toBe(true)
    expect(completa.etapas.find((etapa) => etapa.clave === 'balance')?.destino.query).toMatchObject(
      {
        vista: 'comprobacion',
        cuenta: completa.cuentaPrincipal,
      },
    )
  })

  it('devuelve null para una operación inexistente', () => {
    const store = iniciarStore()

    expect(construirTrazabilidad(store.estado, 'compra', 'C-999')).toBeNull()
    expect(construirTrazabilidad(store.estado, 'venta', 'V-999')).toBeNull()
  })
})
