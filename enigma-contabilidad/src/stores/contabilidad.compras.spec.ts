import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { cargarEstado } from '@/core/persistencia'
import { useContabilidadStore } from '@/stores/contabilidad'
import type { Proveedor } from '@/types/contabilidad'
import type { FechaISO } from '@/types'

function iniciarPinia() {
  localStorage.clear()
  setActivePinia(createPinia())
}

describe('registrarCompra', () => {
  beforeEach(() => iniciarPinia())

  it('registra una compra, genera asiento y documento pendiente', () => {
    const store = useContabilidadStore()
    const proveedor = store.estado.proveedores[0] as Proveedor
    const comprasAntes = store.estado.compras.length
    const asientosAntes = store.estado.asientos.length
    const documentosAntes = store.estado.documentos.length

    const resultado = store.registrarCompra({
      proveedor,
      fecha: '2026-11-05' as FechaISO,
      vencimiento: '2026-12-05' as FechaISO,
      tipoComprobante: 'Factura A',
      numero: 'FC-A-0001-00000109',
      condicionPago: 'cuenta_corriente',
      items: [
        {
          productoId: store.estado.productos[0].id,
          descripcion: 'Producto de prueba',
          cantidad: 2,
          precioUnitario: 100_000,
          alicuotaIva: 21,
          cuentaContable: store.estado.productos[0].cuentaCompra,
        },
      ],
    })

    expect(resultado.ok).toBe(true)
    expect(resultado.compra?.id).toBe('C-009')
    expect(resultado.compra?.numero).toBe('FC-A-0001-00000109')
    expect(store.estado.compras).toHaveLength(comprasAntes + 1)
    expect(store.estado.asientos).toHaveLength(asientosAntes + 1)
    expect(store.estado.documentos).toHaveLength(documentosAntes + 1)

    const documento = store.estado.documentos.find((doc) => doc.id === resultado.documento?.id)
    expect(documento?.estado).toBe('pendiente')
    expect(documento?.origen).toBe('compras')

    const asiento = store.estado.asientos.find((a) => a.id === resultado.asiento?.id)
    expect(asiento?.estado).toBe('propuesto')

    // persistencia
    const persistido = cargarEstado()
    expect(persistido?.compras).toHaveLength(comprasAntes + 1)
  })

  it('rechaza números duplicados', () => {
    const store = useContabilidadStore()
    const proveedor = store.estado.proveedores[0]
    const existente = store.estado.compras[0].numero

    const resultado = store.registrarCompra({
      proveedor,
      fecha: '2026-11-05' as FechaISO,
      vencimiento: '2026-12-05' as FechaISO,
      tipoComprobante: 'Factura A',
      numero: existente,
      condicionPago: 'contado',
      items: [
        {
          productoId: store.estado.productos[0].id,
          descripcion: 'Producto de prueba',
          cantidad: 1,
          precioUnitario: 100_000,
          alicuotaIva: 21,
          cuentaContable: store.estado.productos[0].cuentaCompra,
        },
      ],
    })

    expect(resultado.ok).toBe(false)
    expect(resultado.motivo).toBe('numero_duplicado')
  })
})
