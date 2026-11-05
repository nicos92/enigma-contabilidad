import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  comprasDelPeriodo,
  construirInformeComprasProveedores,
  construirInformeIva,
  construirInformePeriodo,
  construirInformeTopProductos,
  construirInformeVentasClientes,
  descargarCsv,
  dentroDelRango,
  generarCsv,
  generarCsvInforme,
  generarCsvVentasClientes,
  importeCsv,
  nombreArchivoInforme,
  rangoDePeriodo,
  ventasDelPeriodo,
  type RangoInforme,
} from '@/core/informes'
import { useContabilidadStore } from '@/stores/contabilidad'
import { PERIODO_DEMO } from '@/data/catalogos'

function iniciarStore() {
  localStorage.clear()
  setActivePinia(createPinia())
  return useContabilidadStore()
}

function sumar(importes: readonly number[]): number {
  return importes.reduce((total, importe) => total + importe, 0)
}

const PERIODO_COMPLETO: RangoInforme = rangoDePeriodo(PERIODO_DEMO)

describe('informes', () => {
  beforeEach(() => {
    iniciarStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('delimita el período con ambos extremos incluidos', () => {
    expect(PERIODO_COMPLETO).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' })
    expect(dentroDelRango('2026-11-01', PERIODO_COMPLETO)).toBe(true)
    expect(dentroDelRango('2026-11-30', PERIODO_COMPLETO)).toBe(true)
    expect(dentroDelRango('2026-10-31', PERIODO_COMPLETO)).toBe(false)
    expect(dentroDelRango('2026-12-01', PERIODO_COMPLETO)).toBe(false)
  })

  it('solo considera operaciones con documento registrado y fecha dentro del rango', () => {
    const store = iniciarStore()

    const ventas = ventasDelPeriodo(store.estado, PERIODO_COMPLETO)
    const compras = comprasDelPeriodo(store.estado, PERIODO_COMPLETO)

    expect(ventas).toHaveLength(7)
    expect(compras).toHaveLength(7)
    expect(ventas.some((venta) => venta.id === 'V-008')).toBe(false)
    expect(compras.some((compra) => compra.id === 'C-008')).toBe(false)

    const rangoAcotado: RangoInforme = { desde: '2026-11-09', hasta: '2026-11-14' }
    expect(ventasDelPeriodo(store.estado, rangoAcotado).map((venta) => venta.id)).toEqual([
      'V-003',
      'V-004',
      'V-005',
    ])
    expect(comprasDelPeriodo(store.estado, rangoAcotado).map((compra) => compra.id)).toEqual([
      'C-005',
      'C-006',
    ])
  })

  it('agrupa las ventas por cliente e incluye los cobros de esas ventas', () => {
    const store = iniciarStore()
    const informe = construirInformeVentasClientes(store.estado, PERIODO_COMPLETO)
    const ventas = ventasDelPeriodo(store.estado, PERIODO_COMPLETO)

    expect(informe.filas.length).toBeGreaterThan(0)
    expect(informe.totales.operaciones).toBe(ventas.length)
    expect(informe.totales.total).toBe(sumar(ventas.map((venta) => venta.total)))
    expect(informe.totales.subtotal).toBe(sumar(ventas.map((venta) => venta.subtotal)))
    expect(informe.totales.iva).toBe(sumar(ventas.map((venta) => venta.iva)))
    expect(informe.totales.saldo).toBe(informe.totales.total - informe.totales.cobrado)

    for (const fila of informe.filas) {
      expect(fila.saldo).toBe(fila.total - fila.cobrado)
    }

    const clienteConDosVentas = informe.filas.find((fila) => fila.clienteId === 'CLI-03')
    expect(clienteConDosVentas?.operaciones).toBe(2)

    const unDia: RangoInforme = { desde: '2026-11-04', hasta: '2026-11-04' }
    const ventaUnica = construirInformeVentasClientes(store.estado, unDia)
    expect(ventaUnica.filas).toHaveLength(1)
    expect(ventaUnica.filas[0]).toMatchObject({
      clienteId: 'CLI-03',
      operaciones: 1,
      cobrado: 150_000_000,
    })
    expect(ventaUnica.totales.saldo).toBe(ventaUnica.totales.total - 150_000_000)
  })

  it('agrupa las compras por proveedor e incluye los pagos de esas compras', () => {
    const store = iniciarStore()
    const informe = construirInformeComprasProveedores(store.estado, PERIODO_COMPLETO)
    const compras = comprasDelPeriodo(store.estado, PERIODO_COMPLETO)

    expect(informe.totales.operaciones).toBe(compras.length)
    expect(informe.totales.total).toBe(sumar(compras.map((compra) => compra.total)))
    expect(informe.totales.saldo).toBe(informe.totales.total - informe.totales.pagado)

    const unDia: RangoInforme = { desde: '2026-11-02', hasta: '2026-11-02' }
    const compraUnica = construirInformeComprasProveedores(store.estado, unDia)
    expect(compraUnica.filas).toHaveLength(1)
    expect(compraUnica.filas[0]).toMatchObject({
      proveedorId: 'PRV-01',
      operaciones: 1,
      pagado: 350_000_000,
    })
  })

  it('liquida el IVA de las operaciones registradas por alícuota', () => {
    const store = iniciarStore()
    const informe = construirInformeIva(store.estado, PERIODO_COMPLETO)
    const ventas = ventasDelPeriodo(store.estado, PERIODO_COMPLETO)
    const compras = comprasDelPeriodo(store.estado, PERIODO_COMPLETO)

    expect(informe.baseVentas).toBe(sumar(ventas.map((venta) => venta.subtotal)))
    expect(informe.ivaDebito).toBe(sumar(ventas.map((venta) => venta.iva)))
    expect(informe.baseCompras).toBe(sumar(compras.map((compra) => compra.subtotal)))
    expect(informe.ivaCredito).toBe(sumar(compras.map((compra) => compra.iva)))
    expect(informe.saldo).toBe(informe.ivaDebito - informe.ivaCredito)
    expect(informe.saldoAPagar).toBe(Math.max(0, informe.saldo))
    expect(informe.saldoAFavor).toBe(Math.max(0, -informe.saldo))

    expect(sumar(informe.filas.map((fila) => fila.baseVentas))).toBe(informe.baseVentas)
    expect(sumar(informe.filas.map((fila) => fila.ivaDebito))).toBe(informe.ivaDebito)
    expect(sumar(informe.filas.map((fila) => fila.baseCompras))).toBe(informe.baseCompras)
    expect(sumar(informe.filas.map((fila) => fila.ivaCredito))).toBe(informe.ivaCredito)
  })

  it('rankea productos por ventas netas registradas y calcula su participación', () => {
    const store = iniciarStore()
    const informe = construirInformeTopProductos(store.estado, PERIODO_COMPLETO)
    const ventas = ventasDelPeriodo(store.estado, PERIODO_COMPLETO)

    expect(informe.filas.length).toBeGreaterThan(0)
    expect(informe.ventasNetas).toBe(sumar(ventas.map((venta) => venta.subtotal)))
    expect(informe.cantidadTotal).toBe(
      sumar(ventas.flatMap((venta) => venta.items.map((item) => item.cantidad))),
    )
    expect(informe.filas.some((fila) => fila.productoId === 'SERV-03')).toBe(false)

    for (let indice = 1; indice < informe.filas.length; indice += 1) {
      expect(informe.filas[indice - 1]!.subtotal).toBeGreaterThanOrEqual(
        informe.filas[indice]!.subtotal,
      )
    }

    expect(sumar(informe.filas.map((fila) => fila.participacion))).toBeCloseTo(1, 10)

    const limitado = construirInformeTopProductos(store.estado, PERIODO_COMPLETO, 2)
    expect(limitado.filas).toHaveLength(2)
    expect(limitado.ventasNetas).toBe(informe.ventasNetas)
  })

  it('construye el informe consolidado con los cuatro reportes', () => {
    const store = iniciarStore()
    const informe = construirInformePeriodo(store.estado, PERIODO_COMPLETO)

    expect(informe.rango).toEqual(PERIODO_COMPLETO)
    expect(informe.ventasPorCliente.totales.operaciones).toBe(7)
    expect(informe.comprasPorProveedores.totales.operaciones).toBe(7)
    expect(informe.iva.filas.length).toBeGreaterThan(0)
    expect(informe.topProductos.filas.length).toBeGreaterThan(0)
  })

  it('genera CSV estándar con escapes, CRLF y montos en pesos', () => {
    expect(
      generarCsv([
        ['Cliente', 'Total'],
        ['Pérez, Juan', 1234],
      ]),
    ).toBe('Cliente,Total\r\n"Pérez, Juan",1234')
    expect(generarCsv([['Texto "citado"', 'linea\nnueva']])).toBe(
      '"Texto ""citado""","linea\nnueva"',
    )
    expect(importeCsv(123_456)).toBe('1234.56')
    expect(importeCsv(-500)).toBe('-5.00')
  })

  it('exporta cada informe con encabezado y fila de totales', () => {
    const store = iniciarStore()
    const informe = construirInformePeriodo(store.estado, PERIODO_COMPLETO)

    const ventas = generarCsvInforme('ventas-clientes', informe)
    expect(ventas).toContain('Cliente,Operaciones,Subtotal,IVA,Total,Cobrado,Saldo')
    expect(ventas.split('\r\n').at(-1)).toMatch(/^Total,7,/)

    expect(generarCsvInforme('compras-proveedores', informe)).toContain(
      'Proveedor,Operaciones,Subtotal,IVA,Total,Pagado,Saldo',
    )
    expect(generarCsvInforme('iva', informe)).toContain('IVA a pagar')
    expect(generarCsvInforme('top-productos', informe)).toContain(
      'Código,Producto o servicio,Cantidad,Operaciones,Ventas netas,IVA,Total,Participación %',
    )

    expect(generarCsvVentasClientes(informe.ventasPorCliente)).toBe(ventas)
    expect(nombreArchivoInforme('iva', PERIODO_COMPLETO)).toBe(
      'informe-iva-2026-11-01-2026-11-30.csv',
    )
  })

  it('descarga el CSV con BOM UTF-8 y libera la URL temporal', async () => {
    const crearUrl = vi.fn<(blob: Blob) => string>(() => 'blob:informe')
    const liberarUrl = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    Object.defineProperty(URL, 'createObjectURL', { value: crearUrl, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: liberarUrl, configurable: true })

    expect(descargarCsv('informe-iva', 'a,b')).toBe(true)
    expect(crearUrl).toHaveBeenCalledTimes(1)
    expect(liberarUrl).toHaveBeenCalledWith('blob:informe')
    expect(click).toHaveBeenCalledTimes(1)

    const blob = crearUrl.mock.calls[0]![0]
    expect(blob.type).toBe('text/csv;charset=utf-8;')

    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(new TextDecoder().decode(bytes.slice(3))).toBe('a,b')
    expect(document.body.querySelector('a[download="informe-iva.csv"]')).toBeNull()
  })
})
