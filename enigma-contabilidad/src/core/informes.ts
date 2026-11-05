import { calcularIva } from '@/core/dinero'
import type { FechaISO, Periodo } from '@/types'
import type {
  Cliente,
  Compra,
  DocumentoContable,
  EstadoContable,
  Producto,
  Proveedor,
  Venta,
} from '@/types/contabilidad'

/* -------------------------------------------------------------------------- */
/* Período                                                                    */
/* -------------------------------------------------------------------------- */

export interface RangoInforme {
  desde: FechaISO
  hasta: FechaISO
}

export function rangoDePeriodo(periodo: Periodo): RangoInforme {
  return { desde: periodo.desde, hasta: periodo.hasta }
}

/** Indica si una fecha ISO cae dentro del rango, con ambos extremos incluidos. */
export function dentroDelRango(fecha: FechaISO, rango: RangoInforme): boolean {
  return fecha >= rango.desde && fecha <= rango.hasta
}

/* -------------------------------------------------------------------------- */
/* Operaciones registradas                                                    */
/* -------------------------------------------------------------------------- */

function documentosRegistrados(documentos: readonly DocumentoContable[]): Set<string> {
  return new Set(
    documentos
      .filter((documento) => documento.estado === 'registrado')
      .map((documento) => documento.id),
  )
}

/**
 * Ventas que ya impactaron en los libros y cuya fecha pertenece al período.
 * Los comprobantes pendientes, observados o en revisión no se incluyen.
 */
export function ventasDelPeriodo(estado: EstadoContable, rango: RangoInforme): Venta[] {
  const registrados = documentosRegistrados(estado.documentos)
  return estado.ventas.filter(
    (venta) => registrados.has(venta.documentoId) && dentroDelRango(venta.fecha, rango),
  )
}

/** Compras registradas cuya fecha pertenece al período. */
export function comprasDelPeriodo(estado: EstadoContable, rango: RangoInforme): Compra[] {
  const registrados = documentosRegistrados(estado.documentos)
  return estado.compras.filter(
    (compra) => registrados.has(compra.documentoId) && dentroDelRango(compra.fecha, rango),
  )
}

/* -------------------------------------------------------------------------- */
/* Ventas por cliente                                                         */
/* -------------------------------------------------------------------------- */

export interface FilaVentasCliente {
  clienteId: string
  cliente: string
  operaciones: number
  subtotal: number
  iva: number
  total: number
  cobrado: number
  saldo: number
}

export interface TotalesVentasCliente {
  operaciones: number
  subtotal: number
  iva: number
  total: number
  cobrado: number
  saldo: number
}

export interface InformeVentasClientes {
  filas: FilaVentasCliente[]
  totales: TotalesVentasCliente
}

function clientePorId(clientes: readonly Cliente[], id: string): Cliente | undefined {
  return clientes.find((cliente) => cliente.id === id)
}

/**
 * Agrupa las ventas registradas del período por cliente. El cobrado y el saldo
 * consideran todos los recibos registrados asociados a esas ventas, aunque el
 * cobro se haya producido fuera del rango consultado.
 */
export function construirInformeVentasClientes(
  estado: EstadoContable,
  rango: RangoInforme,
): InformeVentasClientes {
  const ventas = ventasDelPeriodo(estado, rango)
  const ventaIds = new Set(ventas.map((venta) => venta.id))
  const registrados = documentosRegistrados(estado.documentos)

  const cobrosPorVenta = new Map<string, number>()
  for (const cobro of estado.cobros) {
    if (!ventaIds.has(cobro.ventaId) || !registrados.has(cobro.documentoId)) continue
    cobrosPorVenta.set(cobro.ventaId, (cobrosPorVenta.get(cobro.ventaId) ?? 0) + cobro.importe)
  }

  const agrupadas = new Map<string, FilaVentasCliente>()
  for (const venta of ventas) {
    const cliente = clientePorId(estado.clientes, venta.clienteId)
    const actual = agrupadas.get(venta.clienteId) ?? {
      clienteId: venta.clienteId,
      cliente: cliente?.nombre ?? 'Cliente sin identificar',
      operaciones: 0,
      subtotal: 0,
      iva: 0,
      total: 0,
      cobrado: 0,
      saldo: 0,
    }

    actual.operaciones += 1
    actual.subtotal += venta.subtotal
    actual.iva += venta.iva
    actual.total += venta.total
    actual.cobrado += cobrosPorVenta.get(venta.id) ?? 0
    actual.saldo = actual.total - actual.cobrado

    agrupadas.set(venta.clienteId, actual)
  }

  const filas = [...agrupadas.values()].sort(
    (a, b) => b.total - a.total || a.cliente.localeCompare(b.cliente, 'es'),
  )

  return {
    filas,
    totales: sumarVentas(filas),
  }
}

function sumarVentas(filas: readonly FilaVentasCliente[]): TotalesVentasCliente {
  return filas.reduce<TotalesVentasCliente>(
    (totales, fila) => ({
      operaciones: totales.operaciones + fila.operaciones,
      subtotal: totales.subtotal + fila.subtotal,
      iva: totales.iva + fila.iva,
      total: totales.total + fila.total,
      cobrado: totales.cobrado + fila.cobrado,
      saldo: totales.saldo + fila.saldo,
    }),
    { operaciones: 0, subtotal: 0, iva: 0, total: 0, cobrado: 0, saldo: 0 },
  )
}

/* -------------------------------------------------------------------------- */
/* Compras por proveedor                                                      */
/* -------------------------------------------------------------------------- */

export interface FilaComprasProveedor {
  proveedorId: string
  proveedor: string
  operaciones: number
  subtotal: number
  iva: number
  total: number
  pagado: number
  saldo: number
}

export interface TotalesComprasProveedor {
  operaciones: number
  subtotal: number
  iva: number
  total: number
  pagado: number
  saldo: number
}

export interface InformeComprasProveedores {
  filas: FilaComprasProveedor[]
  totales: TotalesComprasProveedor
}

function proveedorPorId(proveedores: readonly Proveedor[], id: string): Proveedor | undefined {
  return proveedores.find((proveedor) => proveedor.id === id)
}

/**
 * Agrupa las compras registradas del período por proveedor. El pagado y el
 * saldo consideran todos los pagos registrados asociados a esas compras.
 */
export function construirInformeComprasProveedores(
  estado: EstadoContable,
  rango: RangoInforme,
): InformeComprasProveedores {
  const compras = comprasDelPeriodo(estado, rango)
  const compraIds = new Set(compras.map((compra) => compra.id))
  const registrados = documentosRegistrados(estado.documentos)

  const pagosPorCompra = new Map<string, number>()
  for (const pago of estado.pagos) {
    if (!compraIds.has(pago.compraId) || !registrados.has(pago.documentoId)) continue
    pagosPorCompra.set(pago.compraId, (pagosPorCompra.get(pago.compraId) ?? 0) + pago.importe)
  }

  const agrupadas = new Map<string, FilaComprasProveedor>()
  for (const compra of compras) {
    const proveedor = proveedorPorId(estado.proveedores, compra.proveedorId)
    const actual = agrupadas.get(compra.proveedorId) ?? {
      proveedorId: compra.proveedorId,
      proveedor: proveedor?.nombre ?? 'Proveedor sin identificar',
      operaciones: 0,
      subtotal: 0,
      iva: 0,
      total: 0,
      pagado: 0,
      saldo: 0,
    }

    actual.operaciones += 1
    actual.subtotal += compra.subtotal
    actual.iva += compra.iva
    actual.total += compra.total
    actual.pagado += pagosPorCompra.get(compra.id) ?? 0
    actual.saldo = actual.total - actual.pagado

    agrupadas.set(compra.proveedorId, actual)
  }

  const filas = [...agrupadas.values()].sort(
    (a, b) => b.total - a.total || a.proveedor.localeCompare(b.proveedor, 'es'),
  )

  return {
    filas,
    totales: sumarCompras(filas),
  }
}

function sumarCompras(filas: readonly FilaComprasProveedor[]): TotalesComprasProveedor {
  return filas.reduce<TotalesComprasProveedor>(
    (totales, fila) => ({
      operaciones: totales.operaciones + fila.operaciones,
      subtotal: totales.subtotal + fila.subtotal,
      iva: totales.iva + fila.iva,
      total: totales.total + fila.total,
      pagado: totales.pagado + fila.pagado,
      saldo: totales.saldo + fila.saldo,
    }),
    { operaciones: 0, subtotal: 0, iva: 0, total: 0, pagado: 0, saldo: 0 },
  )
}

/* -------------------------------------------------------------------------- */
/* IVA del período                                                            */
/* -------------------------------------------------------------------------- */

export interface FilaIvaAlicuota {
  alicuota: number
  baseVentas: number
  ivaDebito: number
  baseCompras: number
  ivaCredito: number
}

export interface ResumenIva {
  filas: FilaIvaAlicuota[]
  baseVentas: number
  ivaDebito: number
  baseCompras: number
  ivaCredito: number
  /** Diferencia débito menos crédito. Positiva: a pagar. Negativa: saldo a favor. */
  saldo: number
  saldoAPagar: number
  saldoAFavor: number
}

/**
 * Liquida el IVA del período a partir de las ventas y compras registradas.
 * El desglose por alícuota permite auditar que la suma coincida con las
 * operaciones y con los asientos de IVA Débito y IVA Crédito.
 */
export function construirInformeIva(estado: EstadoContable, rango: RangoInforme): ResumenIva {
  const filas = new Map<number, FilaIvaAlicuota>()

  function filaAlicuota(alicuota: number): FilaIvaAlicuota {
    const actual = filas.get(alicuota) ?? {
      alicuota,
      baseVentas: 0,
      ivaDebito: 0,
      baseCompras: 0,
      ivaCredito: 0,
    }
    filas.set(alicuota, actual)
    return actual
  }

  for (const venta of ventasDelPeriodo(estado, rango)) {
    for (const item of venta.items) {
      const base = item.cantidad * item.precioUnitario
      const fila = filaAlicuota(item.alicuotaIva)
      fila.baseVentas += base
      fila.ivaDebito += calcularIva(base, item.alicuotaIva)
    }
  }

  for (const compra of comprasDelPeriodo(estado, rango)) {
    for (const item of compra.items) {
      const base = item.cantidad * item.precioUnitario
      const fila = filaAlicuota(item.alicuotaIva)
      fila.baseCompras += base
      fila.ivaCredito += calcularIva(base, item.alicuotaIva)
    }
  }

  const filasOrdenadas = [...filas.values()].sort((a, b) => b.alicuota - a.alicuota)
  const totales = filasOrdenadas.reduce(
    (acumulado, fila) => ({
      baseVentas: acumulado.baseVentas + fila.baseVentas,
      ivaDebito: acumulado.ivaDebito + fila.ivaDebito,
      baseCompras: acumulado.baseCompras + fila.baseCompras,
      ivaCredito: acumulado.ivaCredito + fila.ivaCredito,
    }),
    { baseVentas: 0, ivaDebito: 0, baseCompras: 0, ivaCredito: 0 },
  )

  const saldo = totales.ivaDebito - totales.ivaCredito

  return {
    filas: filasOrdenadas,
    ...totales,
    saldo,
    saldoAPagar: saldo > 0 ? saldo : 0,
    saldoAFavor: saldo < 0 ? -saldo : 0,
  }
}

/* -------------------------------------------------------------------------- */
/* Top de productos                                                           */
/* -------------------------------------------------------------------------- */

export interface FilaTopProducto {
  productoId: string
  codigo: string
  nombre: string
  tipo: Producto['tipo'] | 'sin_catalogo'
  cantidad: number
  operaciones: number
  subtotal: number
  iva: number
  total: number
  /** Participación sobre las ventas netas del período (0 a 1). */
  participacion: number
}

export interface InformeTopProductos {
  filas: FilaTopProducto[]
  ventasNetas: number
  cantidadTotal: number
}

function productoPorId(productos: readonly Producto[], id: string): Producto | undefined {
  return productos.find((producto) => producto.id === id)
}

/**
 * Ranking de productos y servicios por ventas netas. Solo considera ventas
 * registradas del período y consolida las líneas de una misma operación.
 */
export function construirInformeTopProductos(
  estado: EstadoContable,
  rango: RangoInforme,
  limite = 10,
): InformeTopProductos {
  const ventas = ventasDelPeriodo(estado, rango)
  const agrupados = new Map<
    string,
    Omit<FilaTopProducto, 'participacion'> & { ventas: Set<string> }
  >()

  for (const venta of ventas) {
    for (const item of venta.items) {
      const producto = productoPorId(estado.productos, item.productoId)
      const clave = item.productoId || item.descripcion
      const base = item.cantidad * item.precioUnitario
      const actual = agrupados.get(clave) ?? {
        productoId: item.productoId,
        codigo: producto?.codigo ?? '—',
        nombre: producto?.nombre ?? item.descripcion,
        tipo: producto?.tipo ?? 'sin_catalogo',
        cantidad: 0,
        operaciones: 0,
        subtotal: 0,
        iva: 0,
        total: 0,
        ventas: new Set<string>(),
      }

      actual.cantidad += item.cantidad
      actual.subtotal += base
      actual.iva += calcularIva(base, item.alicuotaIva)
      actual.total += base + calcularIva(base, item.alicuotaIva)
      actual.ventas.add(venta.id)

      agrupados.set(clave, actual)
    }
  }

  const ventasNetas = [...agrupados.values()].reduce(
    (total, producto) => total + producto.subtotal,
    0,
  )
  const cantidadTotal = [...agrupados.values()].reduce(
    (total, producto) => total + producto.cantidad,
    0,
  )

  const filas = [...agrupados.values()]
    .map<FilaTopProducto>((producto) => ({
      productoId: producto.productoId,
      codigo: producto.codigo,
      nombre: producto.nombre,
      tipo: producto.tipo,
      cantidad: producto.cantidad,
      operaciones: producto.ventas.size,
      subtotal: producto.subtotal,
      iva: producto.iva,
      total: producto.total,
      participacion: ventasNetas > 0 ? producto.subtotal / ventasNetas : 0,
    }))
    .sort((a, b) => b.subtotal - a.subtotal || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, Math.max(0, limite))

  return { filas, ventasNetas, cantidadTotal }
}

/* -------------------------------------------------------------------------- */
/* Informe consolidado                                                        */
/* -------------------------------------------------------------------------- */

export interface InformePeriodo {
  rango: RangoInforme
  ventasPorCliente: InformeVentasClientes
  comprasPorProveedores: InformeComprasProveedores
  iva: ResumenIva
  topProductos: InformeTopProductos
}

export function construirInformePeriodo(
  estado: EstadoContable,
  rango: RangoInforme,
  limiteTopProductos = 10,
): InformePeriodo {
  return {
    rango,
    ventasPorCliente: construirInformeVentasClientes(estado, rango),
    comprasPorProveedores: construirInformeComprasProveedores(estado, rango),
    iva: construirInformeIva(estado, rango),
    topProductos: construirInformeTopProductos(estado, rango, limiteTopProductos),
  }
}

/* -------------------------------------------------------------------------- */
/* Exportación CSV                                                            */
/* -------------------------------------------------------------------------- */

export type ValorCsv = string | number | null | undefined

function escaparValor(valor: ValorCsv): string {
  if (valor === null || valor === undefined) return ''
  const texto = String(valor)
  if (/[",\r\n]/.test(texto)) {
    return `"${texto.replaceAll('"', '""')}"`
  }
  return texto
}

/** Construye un CSV estándar con comas y fin de línea CRLF. */
export function generarCsv(filas: readonly (readonly ValorCsv[])[]): string {
  return filas.map((fila) => fila.map(escaparValor).join(',')).join('\r\n')
}

/** Convierte centavos a pesos con dos decimales para exportación numérica. */
export function importeCsv(centavos: number): string {
  return (centavos / 100).toFixed(2)
}

function porcentajeCsv(valor: number): string {
  return (valor * 100).toFixed(2)
}

export function generarCsvVentasClientes(informe: InformeVentasClientes): string {
  const filas: ValorCsv[][] = [
    ['Cliente', 'Operaciones', 'Subtotal', 'IVA', 'Total', 'Cobrado', 'Saldo'],
  ]

  for (const fila of informe.filas) {
    filas.push([
      fila.cliente,
      fila.operaciones,
      importeCsv(fila.subtotal),
      importeCsv(fila.iva),
      importeCsv(fila.total),
      importeCsv(fila.cobrado),
      importeCsv(fila.saldo),
    ])
  }

  filas.push([
    'Total',
    informe.totales.operaciones,
    importeCsv(informe.totales.subtotal),
    importeCsv(informe.totales.iva),
    importeCsv(informe.totales.total),
    importeCsv(informe.totales.cobrado),
    importeCsv(informe.totales.saldo),
  ])

  return generarCsv(filas)
}

export function generarCsvComprasProveedores(informe: InformeComprasProveedores): string {
  const filas: ValorCsv[][] = [
    ['Proveedor', 'Operaciones', 'Subtotal', 'IVA', 'Total', 'Pagado', 'Saldo'],
  ]

  for (const fila of informe.filas) {
    filas.push([
      fila.proveedor,
      fila.operaciones,
      importeCsv(fila.subtotal),
      importeCsv(fila.iva),
      importeCsv(fila.total),
      importeCsv(fila.pagado),
      importeCsv(fila.saldo),
    ])
  }

  filas.push([
    'Total',
    informe.totales.operaciones,
    importeCsv(informe.totales.subtotal),
    importeCsv(informe.totales.iva),
    importeCsv(informe.totales.total),
    importeCsv(informe.totales.pagado),
    importeCsv(informe.totales.saldo),
  ])

  return generarCsv(filas)
}

export function generarCsvIva(informe: ResumenIva): string {
  const filas: ValorCsv[][] = [
    ['Alícuota', 'Base ventas', 'IVA débito', 'Base compras', 'IVA crédito'],
  ]

  for (const fila of informe.filas) {
    filas.push([
      `${fila.alicuota}%`,
      importeCsv(fila.baseVentas),
      importeCsv(fila.ivaDebito),
      importeCsv(fila.baseCompras),
      importeCsv(fila.ivaCredito),
    ])
  }

  filas.push([
    'Total',
    importeCsv(informe.baseVentas),
    importeCsv(informe.ivaDebito),
    importeCsv(informe.baseCompras),
    importeCsv(informe.ivaCredito),
  ])
  filas.push(['IVA a pagar', '', importeCsv(informe.saldoAPagar), '', ''])
  filas.push(['IVA saldo a favor', '', importeCsv(informe.saldoAFavor), '', ''])

  return generarCsv(filas)
}

export function generarCsvTopProductos(informe: InformeTopProductos): string {
  const filas: ValorCsv[][] = [
    [
      'Código',
      'Producto o servicio',
      'Cantidad',
      'Operaciones',
      'Ventas netas',
      'IVA',
      'Total',
      'Participación %',
    ],
  ]

  for (const fila of informe.filas) {
    filas.push([
      fila.codigo,
      fila.nombre,
      fila.cantidad,
      fila.operaciones,
      importeCsv(fila.subtotal),
      importeCsv(fila.iva),
      importeCsv(fila.total),
      porcentajeCsv(fila.participacion),
    ])
  }

  return generarCsv(filas)
}

export type TipoInformeCsv = 'ventas-clientes' | 'compras-proveedores' | 'iva' | 'top-productos'

export function nombreArchivoInforme(tipo: TipoInformeCsv, rango: RangoInforme): string {
  return `informe-${tipo}-${rango.desde}-${rango.hasta}.csv`
}

export function generarCsvInforme(tipo: TipoInformeCsv, informe: InformePeriodo): string {
  switch (tipo) {
    case 'ventas-clientes':
      return generarCsvVentasClientes(informe.ventasPorCliente)
    case 'compras-proveedores':
      return generarCsvComprasProveedores(informe.comprasPorProveedores)
    case 'iva':
      return generarCsvIva(informe.iva)
    case 'top-productos':
      return generarCsvTopProductos(informe.topProductos)
  }
}

/**
 * Descarga un CSV en el navegador. Devuelve `false` si el entorno no permite
 * crear el archivo, para que la pantalla pueda avisar sin romper la demo.
 */
export function descargarCsv(nombreArchivo: string, contenido: string): boolean {
  if (
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false
  }

  try {
    const blob = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`
    enlace.style.display = 'none'
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}
