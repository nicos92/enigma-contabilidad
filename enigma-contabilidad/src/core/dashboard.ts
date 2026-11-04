import { sumarImportes } from '@/core/dinero'
import type { FechaISO, Periodo } from '@/types'
import type {
  Asiento,
  Compra,
  DocumentoContable,
  EstadoContable,
  EstadoDocumento,
  MovimientoTesoreria,
  SaldoTercero,
  SaldoTesoreria,
  Venta,
} from '@/types/contabilidad'

/* -------------------------------------------------------------------------- */
/* Indicadores                                                                */
/* -------------------------------------------------------------------------- */

export interface IndicadoresDashboard {
  ventas: number
  compras: number
  cuentasPorCobrar: number
  cuentasPorPagar: number
  saldoDisponible: number
  resultadoEjercicio: number
}

export interface DatosIndicadoresDashboard {
  ventas: readonly Venta[]
  compras: readonly Compra[]
  saldosClientes: readonly SaldoTercero[]
  saldosProveedores: readonly SaldoTercero[]
  saldosTesoreria: readonly SaldoTesoreria[]
  resultadoEjercicio: number
}

export function totalVentas(ventas: readonly Venta[]): number {
  return sumarImportes(ventas.map((venta) => venta.total))
}

export function totalCompras(compras: readonly Compra[]): number {
  return sumarImportes(compras.map((compra) => compra.total))
}

/** Suma únicamente los saldos positivos: representan deuda real del tercero. */
export function totalSaldosPositivos(saldos: readonly SaldoTercero[]): number {
  return sumarImportes(saldos.filter((saldo) => saldo.saldo > 0).map((saldo) => saldo.saldo))
}

export function totalSaldoDisponible(saldos: readonly SaldoTesoreria[]): number {
  return sumarImportes(saldos.map((saldo) => saldo.saldoFinal))
}

/**
 * Construye los seis indicadores del panel a partir de las operaciones ya
 * registradas. No hay importes fijos: todo surge de las ventas, compras,
 * saldos de terceros, movimientos de tesorería y resultado del ejercicio.
 */
export function construirIndicadores(datos: DatosIndicadoresDashboard): IndicadoresDashboard {
  return {
    ventas: totalVentas(datos.ventas),
    compras: totalCompras(datos.compras),
    cuentasPorCobrar: totalSaldosPositivos(datos.saldosClientes),
    cuentasPorPagar: totalSaldosPositivos(datos.saldosProveedores),
    saldoDisponible: totalSaldoDisponible(datos.saldosTesoreria),
    resultadoEjercicio: datos.resultadoEjercicio,
  }
}

/* -------------------------------------------------------------------------- */
/* Gráfico de ingresos y egresos                                              */
/* -------------------------------------------------------------------------- */

export interface SemanaIngresoEgreso {
  clave: string
  etiqueta: string
  desde: FechaISO
  hasta: FechaISO
  ingresos: number
  egresos: number
}

function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const siguiente = new Date(Date.UTC(anio!, mes! - 1, dia! + dias))
  return siguiente.toISOString().slice(0, 10) as FechaISO
}

/** Divide el período en semanas calendario consecutivas de siete días. */
export function construirSemanas(periodo: Periodo): SemanaIngresoEgreso[] {
  const semanas: SemanaIngresoEgreso[] = []
  let desde = periodo.desde
  let indice = 1

  while (desde <= periodo.hasta) {
    const finTeorico = sumarDias(desde, 6)
    const hasta = finTeorico > periodo.hasta ? periodo.hasta : finTeorico

    semanas.push({
      clave: `semana-${indice}`,
      etiqueta: `Semana ${indice}`,
      desde,
      hasta,
      ingresos: 0,
      egresos: 0,
    })

    desde = sumarDias(hasta, 1)
    indice += 1
  }

  return semanas
}

/**
 * Agrupa los movimientos de caja y banco por semana. Se excluyen la apertura
 * y las transferencias internas para no inflar los ingresos o egresos con
 * movimientos que no representan flujo real del período.
 */
export function agruparIngresosEgresosPorSemana(
  movimientos: readonly MovimientoTesoreria[],
  periodo: Periodo,
): SemanaIngresoEgreso[] {
  const semanas = construirSemanas(periodo)

  for (const movimiento of movimientos) {
    if (movimiento.fecha < periodo.desde || movimiento.fecha > periodo.hasta) continue
    if (movimiento.origen === 'apertura' || movimiento.origen === 'transferencia') continue

    const semana = semanas.find(
      (actual) => movimiento.fecha >= actual.desde && movimiento.fecha <= actual.hasta,
    )
    if (!semana) continue

    if (movimiento.tipo === 'ingreso') {
      semana.ingresos += movimiento.importe
    } else {
      semana.egresos += movimiento.importe
    }
  }

  return semanas
}

/* -------------------------------------------------------------------------- */
/* Últimas operaciones                                                        */
/* -------------------------------------------------------------------------- */

export type TipoOperacionDashboard = 'compra' | 'venta' | 'pago' | 'cobro' | 'transferencia'

export interface OperacionDashboard {
  id: string
  tipo: TipoOperacionDashboard
  etiquetaTipo: string
  fecha: FechaISO
  descripcion: string
  contraparte: string
  importe: number
  estado: EstadoDocumento
  documentoId: string
}

function buscarDocumento(
  documentos: readonly DocumentoContable[],
  documentoId: string,
): DocumentoContable | undefined {
  return documentos.find((documento) => documento.id === documentoId)
}

/**
 * Reúne compras, ventas, pagos, cobros y transferencias en un único listado
 * cronológico. El estado mostrado es el del documento contable asociado.
 */
export function construirUltimasOperaciones(
  estado: EstadoContable,
  limite = 8,
): OperacionDashboard[] {
  const proveedores = new Map(estado.proveedores.map((proveedor) => [proveedor.id, proveedor]))
  const clientes = new Map(estado.clientes.map((cliente) => [cliente.id, cliente]))

  const operaciones: OperacionDashboard[] = []

  for (const compra of estado.compras) {
    const documento = buscarDocumento(estado.documentos, compra.documentoId)
    operaciones.push({
      id: compra.id,
      tipo: 'compra',
      etiquetaTipo: 'Compra',
      fecha: compra.fecha,
      descripcion: `Factura ${compra.numero}`,
      contraparte: proveedores.get(compra.proveedorId)?.nombre ?? 'Proveedor',
      importe: compra.total,
      estado: documento?.estado ?? 'registrado',
      documentoId: compra.documentoId,
    })
  }

  for (const venta of estado.ventas) {
    const documento = buscarDocumento(estado.documentos, venta.documentoId)
    operaciones.push({
      id: venta.id,
      tipo: 'venta',
      etiquetaTipo: 'Venta',
      fecha: venta.fecha,
      descripcion: `Factura ${venta.numero}`,
      contraparte: clientes.get(venta.clienteId)?.nombre ?? 'Cliente',
      importe: venta.total,
      estado: documento?.estado ?? 'registrado',
      documentoId: venta.documentoId,
    })
  }

  for (const pago of estado.pagos) {
    const documento = buscarDocumento(estado.documentos, pago.documentoId)
    operaciones.push({
      id: pago.id,
      tipo: 'pago',
      etiquetaTipo: 'Pago',
      fecha: pago.fecha,
      descripcion: `Comprobante ${pago.numero}`,
      contraparte: proveedores.get(pago.proveedorId)?.nombre ?? 'Proveedor',
      importe: pago.importe,
      estado: documento?.estado ?? 'registrado',
      documentoId: pago.documentoId,
    })
  }

  for (const cobro of estado.cobros) {
    const documento = buscarDocumento(estado.documentos, cobro.documentoId)
    operaciones.push({
      id: cobro.id,
      tipo: 'cobro',
      etiquetaTipo: 'Cobro',
      fecha: cobro.fecha,
      descripcion: `Recibo ${cobro.numero}`,
      contraparte: clientes.get(cobro.clienteId)?.nombre ?? 'Cliente',
      importe: cobro.importe,
      estado: documento?.estado ?? 'registrado',
      documentoId: cobro.documentoId,
    })
  }

  for (const transferencia of estado.transferencias) {
    const documento = buscarDocumento(estado.documentos, transferencia.documentoId)
    operaciones.push({
      id: transferencia.id,
      tipo: 'transferencia',
      etiquetaTipo: 'Transferencia',
      fecha: transferencia.fecha,
      descripcion: transferencia.descripcion,
      contraparte: 'Caja y banco',
      importe: transferencia.importe,
      estado: documento?.estado ?? 'registrado',
      documentoId: transferencia.documentoId,
    })
  }

  return operaciones
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
    .slice(0, limite)
}

/* -------------------------------------------------------------------------- */
/* Pendientes                                                                 */
/* -------------------------------------------------------------------------- */

/** Documentos que todavía requieren revisión o aprobación en Contaduría. */
export function documentosPendientesAprobacion(
  documentos: readonly DocumentoContable[],
): DocumentoContable[] {
  return documentos
    .filter((documento) => documento.estado === 'pendiente' || documento.estado === 'en_revision')
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.numero.localeCompare(b.numero))
}

export interface OperacionPendienteRegistracion {
  asientoId: string
  fecha: FechaISO
  concepto: string
  importe: number
  documentoId: string | null
  numeroDocumento: string
  origen: Asiento['origen']
  estadoDocumento: EstadoDocumento
}

/**
 * Asientos propuestos que aún no impactaron en los libros. Se muestran como
 * operaciones pendientes de registración contable.
 */
export function operacionesPendientesRegistracion(
  asientos: readonly Asiento[],
  documentos: readonly DocumentoContable[],
): OperacionPendienteRegistracion[] {
  return asientos
    .filter((asiento) => asiento.estado === 'propuesto')
    .map((asiento) => {
      const documento = documentos.find(
        (documentoActual) => documentoActual.asientoId === asiento.id,
      )

      return {
        asientoId: asiento.id,
        fecha: asiento.fecha,
        concepto: asiento.concepto,
        importe: asiento.lineas.reduce((total, linea) => total + linea.debe, 0),
        documentoId: documento?.id ?? null,
        numeroDocumento: documento?.numero ?? 'Sin documento',
        origen: asiento.origen,
        estadoDocumento: documento?.estado ?? 'pendiente',
      }
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.asientoId.localeCompare(b.asientoId))
}
