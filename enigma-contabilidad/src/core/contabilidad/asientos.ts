import { CODIGOS } from '@/data/plan-cuentas'
import type {
  Asiento,
  Cobro,
  Compra,
  EstadoAsiento,
  LineaAsiento,
  OrigenAsiento,
  Pago,
  Transferencia,
  Venta,
} from '@/types/contabilidad'
import type { FechaISO } from '@/types'

export interface DatosAsiento {
  id: string
  fecha: FechaISO
  concepto: string
  origen: OrigenAsiento
  origenId: string | null
  documentoId: string | null
  lineas: LineaAsiento[]
  estado?: EstadoAsiento
  numero?: number | null
  fechaRegistro?: FechaISO | null
}

/** Devuelve los errores de una línea; un arreglo vacío significa que es válida. */
export function validarLinea(linea: LineaAsiento): string[] {
  const errores: string[] = []

  if (!linea.cuentaId) errores.push('La línea no tiene cuenta contable.')
  if (!Number.isInteger(linea.debe) || linea.debe < 0) {
    errores.push(`El Debe de ${linea.cuentaId} debe ser un entero no negativo.`)
  }
  if (!Number.isInteger(linea.haber) || linea.haber < 0) {
    errores.push(`El Haber de ${linea.cuentaId} debe ser un entero no negativo.`)
  }
  if (linea.debe > 0 && linea.haber > 0) {
    errores.push(`La línea ${linea.cuentaId} no puede tener importe en Debe y Haber.`)
  }
  if (linea.debe === 0 && linea.haber === 0) {
    errores.push(`La línea ${linea.cuentaId} no puede tener importe cero.`)
  }

  return errores
}

export function totalDebe(asiento: Pick<Asiento, 'lineas'>): number {
  return asiento.lineas.reduce((total, linea) => total + linea.debe, 0)
}

export function totalHaber(asiento: Pick<Asiento, 'lineas'>): number {
  return asiento.lineas.reduce((total, linea) => total + linea.haber, 0)
}

export function diferenciaAsiento(asiento: Pick<Asiento, 'lineas'>): number {
  return totalDebe(asiento) - totalHaber(asiento)
}

export function asientoBalanceado(asiento: Pick<Asiento, 'lineas'>): boolean {
  if (asiento.lineas.length < 2) return false
  const debe = totalDebe(asiento)
  const haber = totalHaber(asiento)
  return debe > 0 && debe === haber
}

/** Valida estructura, importes y partida doble. */
export function validarAsiento(asiento: Pick<Asiento, 'lineas'>): string[] {
  const errores = asiento.lineas.flatMap((linea) => validarLinea(linea))

  if (asiento.lineas.length === 0) {
    errores.push('El asiento no tiene líneas.')
  }

  if (!asientoBalanceado(asiento)) {
    errores.push(
      `El asiento no está balanceado: Debe ${totalDebe(asiento)} / Haber ${totalHaber(asiento)}.`,
    )
  }

  return errores
}

/**
 * Construye un asiento y falla de inmediato si no cumple las reglas de la
 * partida doble. Así los datos demo no pueden quedar desbalanceados.
 */
export function construirAsiento(datos: DatosAsiento): Asiento {
  const asiento: Asiento = {
    id: datos.id,
    numero: datos.numero ?? null,
    fecha: datos.fecha,
    concepto: datos.concepto,
    origen: datos.origen,
    origenId: datos.origenId,
    documentoId: datos.documentoId,
    estado: datos.estado ?? 'propuesto',
    fechaRegistro: datos.fechaRegistro ?? null,
    lineas: datos.lineas,
  }

  const errores = validarAsiento(asiento)
  if (errores.length > 0) {
    throw new Error(`Asiento inválido (${datos.id}): ${errores.join(' ')}`)
  }

  return asiento
}

export function lineaDebe(cuentaId: string, importe: number, detalle?: string): LineaAsiento {
  return { cuentaId, debe: importe, haber: 0, detalle }
}

export function lineaHaber(cuentaId: string, importe: number, detalle?: string): LineaAsiento {
  return { cuentaId, debe: 0, haber: importe, detalle }
}

function agruparImportes(
  lineas: ReadonlyArray<{ cuentaId: string; importe: number }>,
): Map<string, number> {
  const agrupados = new Map<string, number>()
  for (const { cuentaId, importe } of lineas) {
    if (importe === 0) continue
    agrupados.set(cuentaId, (agrupados.get(cuentaId) ?? 0) + importe)
  }
  return agrupados
}

/* -------------------------------------------------------------------------- */
/* Generadores por tipo de operación                                          */
/* -------------------------------------------------------------------------- */

/** Devuelve el próximo número correlativo para un asiento registrado. */
export function siguienteNumeroAsiento(asientos: readonly Asiento[]): number {
  const maximo = asientos.reduce((max, asiento) => {
    if (asiento.estado !== 'registrado' || asiento.numero === null) return max
    return Math.max(max, asiento.numero)
  }, 0)
  return maximo + 1
}

/**
 * Numera los asientos registrados por fecha y deja los propuestos sin número.
 * Se usa al construir el estado demo para que la numeración sea determinista.
 */
export function numerarAsientos(asientos: Asiento[]): void {
  const registrados = asientos
    .filter((asiento) => asiento.estado === 'registrado')
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id))

  registrados.forEach((asiento, indice) => {
    asiento.numero = indice + 1
    asiento.fechaRegistro = asiento.fecha
  })

  for (const asiento of asientos) {
    if (asiento.estado !== 'registrado') {
      asiento.numero = null
      asiento.fechaRegistro = null
    }
  }
}

export interface DatosApertura {
  id?: string
  fecha: FechaISO
  documentoId: string | null
  caja: number
  banco: number
  mercaderias: number
  equipos: number
  amortizacionAcumulada?: number
  concepto?: string
}

export function generarAsientoApertura(datos: DatosApertura): Asiento {
  const amortizacion = datos.amortizacionAcumulada ?? 0
  const activo = datos.caja + datos.banco + datos.mercaderias + datos.equipos - amortizacion
  const lineas: LineaAsiento[] = [
    lineaDebe(CODIGOS.CAJA, datos.caja, 'Saldo inicial de caja'),
    lineaDebe(CODIGOS.BANCO, datos.banco, 'Saldo inicial de banco'),
    lineaDebe(CODIGOS.MERCADERIAS, datos.mercaderias, 'Stock inicial valorizado'),
    lineaDebe(CODIGOS.EQUIPOS, datos.equipos, 'Equipos de oficina'),
  ]

  if (amortizacion > 0) {
    lineas.push(lineaHaber(CODIGOS.AMORTIZACION_EQUIPOS, amortizacion, 'Amortización acumulada'))
  }

  lineas.push(lineaHaber(CODIGOS.CAPITAL, activo, 'Capital social'))

  return construirAsiento({
    id: datos.id ?? 'asiento-apertura',
    fecha: datos.fecha,
    concepto: datos.concepto ?? 'Asiento de apertura del ejercicio',
    origen: 'apertura',
    origenId: 'apertura',
    documentoId: datos.documentoId,
    lineas,
  })
}

export function generarAsientoCompra(compra: Compra, concepto?: string): Asiento {
  const debitos = agruparImportes(
    compra.items.map((item) => ({
      cuentaId: item.cuentaContable,
      importe: item.cantidad * item.precioUnitario,
    })),
  )

  const lineas: LineaAsiento[] = []
  for (const [cuentaId, importe] of debitos) {
    lineas.push(lineaDebe(cuentaId, importe, `Compra ${compra.numero}`))
  }
  if (compra.iva > 0) {
    lineas.push(lineaDebe(CODIGOS.IVA_CREDITO, compra.iva, `IVA crédito ${compra.numero}`))
  }
  lineas.push(lineaHaber(CODIGOS.PROVEEDORES, compra.total, `Proveedor ${compra.numero}`))

  return construirAsiento({
    id: `asiento-compra-${compra.id}`,
    fecha: compra.fecha,
    concepto: concepto ?? `Compra de mercaderías ${compra.numero}`,
    origen: 'compra',
    origenId: compra.id,
    documentoId: compra.documentoId,
    lineas,
  })
}

export function generarAsientoVenta(venta: Venta, concepto?: string): Asiento {
  const ingresos = agruparImportes(
    venta.items.map((item) => ({
      cuentaId: item.cuentaIngreso,
      importe: item.cantidad * item.precioUnitario,
    })),
  )
  const costos = agruparImportes(
    venta.items.map((item) => ({
      cuentaId: item.cuentaCosto,
      importe: item.cantidad * item.costoUnitario,
    })),
  )

  const lineas: LineaAsiento[] = [
    lineaDebe(CODIGOS.DEUDORES, venta.total, `Cliente ${venta.numero}`),
  ]

  for (const [cuentaId, importe] of ingresos) {
    lineas.push(lineaHaber(cuentaId, importe, `Venta ${venta.numero}`))
  }
  if (venta.iva > 0) {
    lineas.push(lineaHaber(CODIGOS.IVA_DEBITO, venta.iva, `IVA débito ${venta.numero}`))
  }

  let costoTotal = 0
  for (const [cuentaId, importe] of costos) {
    lineas.push(lineaDebe(cuentaId, importe, `Costo de ventas ${venta.numero}`))
    costoTotal += importe
  }
  if (costoTotal > 0) {
    lineas.push(lineaHaber(CODIGOS.MERCADERIAS, costoTotal, `Salida de stock ${venta.numero}`))
  }

  return construirAsiento({
    id: `asiento-venta-${venta.id}`,
    fecha: venta.fecha,
    concepto: concepto ?? `Venta de mercaderías y servicios ${venta.numero}`,
    origen: 'venta',
    origenId: venta.id,
    documentoId: venta.documentoId,
    lineas,
  })
}

export function generarAsientoPago(pago: Pago, concepto?: string): Asiento {
  return construirAsiento({
    id: `asiento-pago-${pago.id}`,
    fecha: pago.fecha,
    concepto: concepto ?? `Pago a proveedor ${pago.numero}`,
    origen: 'pago',
    origenId: pago.id,
    documentoId: pago.documentoId,
    lineas: [
      lineaDebe(CODIGOS.PROVEEDORES, pago.importe, `Cancelación ${pago.numero}`),
      lineaHaber(pago.cuentaId, pago.importe, `Pago ${pago.numero}`),
    ],
  })
}

export function generarAsientoCobro(cobro: Cobro, concepto?: string): Asiento {
  return construirAsiento({
    id: `asiento-cobro-${cobro.id}`,
    fecha: cobro.fecha,
    concepto: concepto ?? `Cobro a cliente ${cobro.numero}`,
    origen: 'cobro',
    origenId: cobro.id,
    documentoId: cobro.documentoId,
    lineas: [
      lineaDebe(cobro.cuentaId, cobro.importe, `Cobro ${cobro.numero}`),
      lineaHaber(CODIGOS.DEUDORES, cobro.importe, `Cancelación ${cobro.numero}`),
    ],
  })
}

export function generarAsientoTransferencia(
  transferencia: Transferencia,
  concepto?: string,
): Asiento {
  return construirAsiento({
    id: `asiento-transferencia-${transferencia.id}`,
    fecha: transferencia.fecha,
    concepto: concepto ?? transferencia.descripcion,
    origen: 'transferencia',
    origenId: transferencia.id,
    documentoId: transferencia.documentoId,
    lineas: [
      lineaDebe(transferencia.cuentaDestinoId, transferencia.importe, 'Transferencia interna'),
      lineaHaber(transferencia.cuentaOrigenId, transferencia.importe, 'Transferencia interna'),
    ],
  })
}

export interface DatosAmortizacion {
  id?: string
  fecha: FechaISO
  importe: number
  documentoId: string | null
  concepto?: string
}

export function generarAsientoAmortizacion(datos: DatosAmortizacion): Asiento {
  return construirAsiento({
    id: datos.id ?? 'asiento-amortizacion',
    fecha: datos.fecha,
    concepto: datos.concepto ?? 'Amortización mensual de equipos de oficina',
    origen: 'amortizacion',
    origenId: 'amortizacion',
    documentoId: datos.documentoId,
    lineas: [
      lineaDebe(CODIGOS.AMORTIZACIONES, datos.importe, 'Amortización del período'),
      lineaHaber(CODIGOS.AMORTIZACION_EQUIPOS, datos.importe, 'Amortización acumulada'),
    ],
  })
}

export interface DatosLiquidacionIva {
  id?: string
  fecha: FechaISO
  ivaDebito: number
  ivaCredito: number
  documentoId: string | null
  concepto?: string
}

/** Traslada los saldos de IVA a la cuenta de saldo a favor o a pagar. */
export function generarAsientoLiquidacionIva(datos: DatosLiquidacionIva): Asiento {
  const lineas: LineaAsiento[] = [
    lineaDebe(CODIGOS.IVA_DEBITO, datos.ivaDebito, 'Cierre de IVA débito fiscal'),
    lineaHaber(CODIGOS.IVA_CREDITO, datos.ivaCredito, 'Cierre de IVA crédito fiscal'),
  ]

  if (datos.ivaCredito > datos.ivaDebito) {
    lineas.push(
      lineaDebe(
        CODIGOS.IVA_SALDO_FAVOR,
        datos.ivaCredito - datos.ivaDebito,
        'Saldo a favor del período',
      ),
    )
  } else if (datos.ivaDebito > datos.ivaCredito) {
    lineas.push(
      lineaHaber(
        CODIGOS.IVA_A_PAGAR,
        datos.ivaDebito - datos.ivaCredito,
        'Saldo a pagar del período',
      ),
    )
  }

  return construirAsiento({
    id: datos.id ?? 'asiento-liquidacion-iva',
    fecha: datos.fecha,
    concepto: datos.concepto ?? 'Liquidación mensual de IVA',
    origen: 'ajuste',
    origenId: 'liquidacion-iva',
    documentoId: datos.documentoId,
    lineas,
  })
}

export interface DatosImpuestoGanancias {
  id?: string
  fecha: FechaISO
  importe: number
  documentoId: string | null
  concepto?: string
}

export function generarAsientoImpuestoGanancias(datos: DatosImpuestoGanancias): Asiento {
  return construirAsiento({
    id: datos.id ?? 'asiento-impuesto-ganancias',
    fecha: datos.fecha,
    concepto: datos.concepto ?? 'Provisión de impuesto a las ganancias',
    origen: 'impuesto',
    origenId: 'impuesto-ganancias',
    documentoId: datos.documentoId,
    lineas: [
      lineaDebe(CODIGOS.IMPUESTO_GANANCIAS, datos.importe, 'Impuesto del ejercicio'),
      lineaHaber(CODIGOS.IMPUESTO_GANANCIAS_A_PAGAR, datos.importe, 'Provisión del período'),
    ],
  })
}
