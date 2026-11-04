import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { useContabilidadStore } from '@/stores/contabilidad'

import {
  ALICUOTAS_IVA_COMPRA,
  TIPOS_COMPROBANTE_COMPRA,
  calcularVencimiento,
  etiquetaEstadoContable,
  etiquetaEstadoPago,
  filtrarCompras,
  filtrosCompraVacios,
  hayErroresCompra,
  prefijoComprobanteCompra,
  resumirCompras,
  siguienteIdCompra,
  siguienteNumeroComprobanteCompra,
  validarCompra,
} from '@/core/compras'

function iniciarStore() {
  localStorage.clear()
  setActivePinia(createPinia())
  return useContabilidadStore()
}

describe('core/compras', () => {
  it('calcula la numeración automática del próximo comprobante', () => {
    const store = iniciarStore()
    expect(siguienteNumeroComprobanteCompra(store.estado.compras, 'Factura A')).toBe(
      'FC-A-0001-00000109',
    )
    expect(siguienteIdCompra(store.estado.compras)).toBe('C-009')
    expect(prefijoComprobanteCompra('Factura A')).toBe('FC-A-0001-')
  })

  it('calcula vencimientos según la condición de pago', () => {
    expect(calcularVencimiento('2026-11-05', 'contado')).toBe('2026-11-05')
    expect(calcularVencimiento('2026-11-05', 'cuenta_corriente')).toBe('2026-12-05')
  })

  it('filtra por proveedor y estado', () => {
    const store = iniciarStore()
    const filtros = filtrosCompraVacios()
    filtros.texto = 'Tecnología del Plata'
    const resultado = filtrarCompras(
      store.estado.compras,
      store.estado.proveedores,
      store.estado.pagos,
      store.estado.documentos,
      filtros,
    )
    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado.every((compra) => compra.proveedorId === 'PRV-01')).toBe(true)
  })

  it('resume compras y pendientes de registración', () => {
    const store = iniciarStore()
    const resumen = resumirCompras(
      store.estado.compras,
      store.estado.pagos,
      store.estado.documentos,
    )
    expect(resumen.cantidad).toBe(8)
    expect(resumen.pendientesRegistracion).toBe(1)
  })

  it('valida una compra incompleta', () => {
    const errores = validarCompra(
      {
        proveedorId: '',
        fecha: '2026-11-05',
        vencimiento: '2026-11-05',
        tipoComprobante: 'Factura A',
        numero: 'FC-A-0001-00000109',
        condicionPago: 'contado',
        items: [],
      },
      [],
    )
    expect(hayErroresCompra(errores)).toBe(true)
    expect(errores.proveedorId).toBeTruthy()
    expect(errores.items).toBeTruthy()
  })

  it('expone catálogos básicos', () => {
    expect(TIPOS_COMPROBANTE_COMPRA).toContain('Factura A')
    expect(ALICUOTAS_IVA_COMPRA).toContain(21)
  })

  it('etiqueta estados', () => {
    expect(etiquetaEstadoPago('pendiente')).toBe('Pendiente')
    expect(etiquetaEstadoContable('pendiente')).toBe('Pendiente de revisión')
  })
})
