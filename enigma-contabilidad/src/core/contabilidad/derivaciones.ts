import { CODIGOS } from '@/data/plan-cuentas'
import type { FechaISO } from '@/types'
import type {
  Asiento,
  BalanceComprobacion,
  Cliente,
  Cobro,
  Compra,
  Cuenta,
  DocumentoContable,
  EstadoEvolucionPatrimonioNeto,
  EstadoFlujoEfectivo,
  EstadoResultados,
  EstadoSituacionPatrimonial,
  FilaBalanceComprobacion,
  FilaEvolucionPatrimonioNeto,
  FilaLibroDiario,
  LibroDiario,
  LibroMayor,
  LineaEstado,
  MovimientoMayor,
  MovimientoTesoreria,
  OrigenMovimiento,
  Pago,
  Producto,
  Proveedor,
  SaldoTercero,
  SaldoTesoreria,
  StockProducto,
  Venta,
} from '@/types/contabilidad'

export interface RangoFechas {
  desde?: FechaISO
  hasta?: FechaISO
}

const CUENTAS_TESORERIA = new Set<string>([CODIGOS.CAJA, CODIGOS.BANCO])

function dentroDelRango(fecha: FechaISO, rango?: RangoFechas): boolean {
  if (!rango) return true
  if (rango.desde && fecha < rango.desde) return false
  if (rango.hasta && fecha > rango.hasta) return false
  return true
}

function antesDelRango(fecha: FechaISO, rango?: RangoFechas): boolean {
  return Boolean(rango?.desde && fecha < rango.desde)
}

function ordenarAsientos(asientos: readonly Asiento[]): Asiento[] {
  return [...asientos].sort((a, b) => {
    const porFecha = a.fecha.localeCompare(b.fecha)
    if (porFecha !== 0) return porFecha
    const porNumero = (a.numero ?? 0) - (b.numero ?? 0)
    if (porNumero !== 0) return porNumero
    return a.id.localeCompare(b.id)
  })
}

function mapaCuentas(cuentas: readonly Cuenta[]): Map<string, Cuenta> {
  return new Map(cuentas.map((cuenta) => [cuenta.codigo, cuenta]))
}

function importeAcreedor(fila: FilaBalanceComprobacion): number {
  return fila.saldoAcreedor - fila.saldoDeudor
}

function importeDeudor(fila: FilaBalanceComprobacion): number {
  return fila.saldoDeudor - fila.saldoAcreedor
}

function ordenarLineasEstados(lineas: LineaEstado[]): LineaEstado[] {
  return lineas.sort((a, b) => a.codigo.localeCompare(b.codigo))
}

/* -------------------------------------------------------------------------- */
/* Libro Diario                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Deriva el Libro Diario exclusivamente de los asientos registrados.
 * Los asientos propuestos o anulados no participan de los libros.
 */
export function derivarLibroDiario(
  asientos: readonly Asiento[],
  cuentas: readonly Cuenta[],
  rango?: RangoFechas,
): LibroDiario {
  const cuentasPorCodigo = mapaCuentas(cuentas)
  const registrados = ordenarAsientos(
    asientos.filter(
      (asiento) => asiento.estado === 'registrado' && dentroDelRango(asiento.fecha, rango),
    ),
  )

  const filas: FilaLibroDiario[] = []

  for (const asiento of registrados) {
    for (const linea of asiento.lineas) {
      if (linea.debe === 0 && linea.haber === 0) continue
      filas.push({
        asientoId: asiento.id,
        numeroAsiento: asiento.numero ?? 0,
        fecha: asiento.fecha,
        concepto: asiento.concepto,
        origen: asiento.origen,
        cuentaId: linea.cuentaId,
        cuentaNombre: cuentasPorCodigo.get(linea.cuentaId)?.nombre ?? linea.cuentaId,
        detalle: linea.detalle ?? asiento.concepto,
        debe: linea.debe,
        haber: linea.haber,
      })
    }
  }

  const totalDebe = filas.reduce((total, fila) => total + fila.debe, 0)
  const totalHaber = filas.reduce((total, fila) => total + fila.haber, 0)

  return {
    asientos: registrados,
    filas,
    totalDebe,
    totalHaber,
    balanceado: totalDebe === totalHaber && totalDebe > 0,
  }
}

/* -------------------------------------------------------------------------- */
/* Libro Mayor                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Deriva el Libro Mayor a partir de las filas del Libro Diario.
 * Si se indica un rango, los movimientos anteriores a `desde` forman el saldo
 * inicial y los posteriores a `hasta` se excluyen.
 */
export function derivarLibroMayor(
  libroDiario: LibroDiario,
  cuentas: readonly Cuenta[],
  rango?: RangoFechas,
): LibroMayor {
  const mayor: LibroMayor = {}

  for (const cuenta of cuentas.filter((cuentaContable) => cuentaContable.imputable)) {
    const filasIniciales = libroDiario.filas.filter(
      (fila) => fila.cuentaId === cuenta.codigo && antesDelRango(fila.fecha, rango),
    )
    const saldoInicial = filasIniciales.reduce((total, fila) => total + fila.debe - fila.haber, 0)

    let saldo = saldoInicial
    const movimientos: MovimientoMayor[] = []

    for (const fila of libroDiario.filas) {
      if (fila.cuentaId !== cuenta.codigo) continue
      if (!dentroDelRango(fila.fecha, rango)) continue

      saldo += fila.debe - fila.haber
      movimientos.push({
        asientoId: fila.asientoId,
        numeroAsiento: fila.numeroAsiento,
        fecha: fila.fecha,
        concepto: fila.detalle || fila.concepto,
        debe: fila.debe,
        haber: fila.haber,
        saldo,
      })
    }

    const totalDebe = movimientos.reduce((total, movimiento) => total + movimiento.debe, 0)
    const totalHaber = movimientos.reduce((total, movimiento) => total + movimiento.haber, 0)

    mayor[cuenta.codigo] = {
      cuenta,
      saldoInicial,
      movimientos,
      totalDebe,
      totalHaber,
      saldoFinal: saldoInicial + totalDebe - totalHaber,
    }
  }

  return mayor
}

/* -------------------------------------------------------------------------- */
/* Balance de comprobación                                                    */
/* -------------------------------------------------------------------------- */

/** Deriva el balance de sumas y saldos a partir de los saldos del Mayor. */
export function derivarBalanceComprobacion(
  libroMayor: LibroMayor,
  cuentas: readonly Cuenta[],
): BalanceComprobacion {
  const filas: FilaBalanceComprobacion[] = []

  for (const cuenta of cuentas) {
    if (!cuenta.imputable) continue
    const mayorCuenta = libroMayor[cuenta.codigo]
    if (!mayorCuenta) continue

    const tieneActividad =
      mayorCuenta.saldoInicial !== 0 || mayorCuenta.totalDebe !== 0 || mayorCuenta.totalHaber !== 0

    if (!tieneActividad) continue

    filas.push({
      cuentaId: cuenta.codigo,
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      naturaleza: cuenta.naturaleza,
      rubro: cuenta.rubro,
      sumaDebe: mayorCuenta.totalDebe,
      sumaHaber: mayorCuenta.totalHaber,
      saldoDeudor: Math.max(mayorCuenta.saldoFinal, 0),
      saldoAcreedor: Math.max(-mayorCuenta.saldoFinal, 0),
    })
  }

  const totalSumaDebe = filas.reduce((total, fila) => total + fila.sumaDebe, 0)
  const totalSumaHaber = filas.reduce((total, fila) => total + fila.sumaHaber, 0)
  const totalSaldoDeudor = filas.reduce((total, fila) => total + fila.saldoDeudor, 0)
  const totalSaldoAcreedor = filas.reduce((total, fila) => total + fila.saldoAcreedor, 0)

  return {
    filas,
    totalSumaDebe,
    totalSumaHaber,
    totalSaldoDeudor,
    totalSaldoAcreedor,
    balanceado: totalSumaDebe === totalSumaHaber && totalSaldoDeudor === totalSaldoAcreedor,
  }
}

/* -------------------------------------------------------------------------- */
/* Estados contables                                                          */
/* -------------------------------------------------------------------------- */

/** Deriva el Estado de Resultados a partir del Balance de Comprobación. */
export function derivarEstadoResultados(
  balance: BalanceComprobacion,
  cuentas: readonly Cuenta[],
): EstadoResultados {
  const cuentasPorCodigo = mapaCuentas(cuentas)

  const filasIngreso = balance.filas.filter((fila) => fila.tipo === 'ingreso')
  const ingresos = ordenarLineasEstados(
    filasIngreso
      .map((fila) => ({
        codigo: fila.codigo,
        nombre: fila.nombre,
        importe: importeAcreedor(fila),
      }))
      .filter((linea) => linea.importe !== 0),
  )

  const totalIngresos = ingresos.reduce((total, linea) => total + linea.importe, 0)
  const ventasNetas = ingresos.find((linea) => linea.codigo === CODIGOS.VENTAS)?.importe ?? 0

  const filasCosto = balance.filas.filter((fila) => fila.rubro === 'costo')
  const costoVentas = filasCosto.reduce((total, fila) => total + importeDeudor(fila), 0)

  const filasGasto = balance.filas.filter((fila) => fila.rubro === 'gasto_operativo')
  const gastosOperativos = ordenarLineasEstados(
    filasGasto
      .map((fila) => ({
        codigo: fila.codigo,
        nombre: fila.nombre,
        importe: importeDeudor(fila),
      }))
      .filter((linea) => linea.importe !== 0),
  )

  const filasImpuesto = balance.filas.filter((fila) => fila.rubro === 'impuesto')
  const impuestoGanancias = filasImpuesto.reduce((total, fila) => total + importeDeudor(fila), 0)

  const totalGastosOperativos = gastosOperativos.reduce((total, linea) => total + linea.importe, 0)
  const resultadoBruto = totalIngresos - costoVentas
  const resultadoOperativo = resultadoBruto - totalGastosOperativos
  const resultadoAntesImpuestos = resultadoOperativo
  const resultadoEjercicio = resultadoAntesImpuestos - impuestoGanancias

  // `cuentasPorCodigo` se usa para validar que las cuentas del balance existan.
  for (const fila of balance.filas) {
    if (!cuentasPorCodigo.has(fila.cuentaId)) {
      throw new Error(`El balance contiene una cuenta desconocida: ${fila.cuentaId}`)
    }
  }

  return {
    ingresos,
    ventasNetas,
    totalIngresos,
    costoVentas,
    resultadoBruto,
    gastosOperativos,
    totalGastosOperativos,
    resultadoOperativo,
    resultadoAntesImpuestos,
    impuestoGanancias,
    resultadoEjercicio,
  }
}

/**
 * Deriva el Estado de Situación Patrimonial a partir del Balance de
 * Comprobación y del resultado del ejercicio.
 */
export function derivarEstadoSituacionPatrimonial(
  balance: BalanceComprobacion,
  cuentas: readonly Cuenta[],
  resultado: EstadoResultados,
): EstadoSituacionPatrimonial {
  const cuentasPorCodigo = mapaCuentas(cuentas)

  const activoCorriente = ordenarLineasEstados(
    balance.filas
      .filter((fila) => fila.rubro === 'activo_corriente')
      .map((fila) => ({
        codigo: fila.codigo,
        nombre: fila.nombre,
        importe: importeDeudor(fila),
      }))
      .filter((linea) => linea.importe !== 0),
  )

  const activoNoCorriente = ordenarLineasEstados(
    balance.filas
      .filter((fila) => fila.rubro === 'activo_no_corriente')
      .map((fila) => ({
        codigo: fila.codigo,
        nombre: fila.nombre,
        importe: importeDeudor(fila),
      }))
      .filter((linea) => linea.importe !== 0),
  )

  const pasivoCorriente = ordenarLineasEstados(
    balance.filas
      .filter((fila) => fila.rubro === 'pasivo_corriente')
      .map((fila) => ({
        codigo: fila.codigo,
        nombre: fila.nombre,
        importe: importeAcreedor(fila),
      }))
      .filter((linea) => linea.importe !== 0),
  )

  const pasivoNoCorriente = ordenarLineasEstados(
    balance.filas
      .filter((fila) => fila.rubro === 'pasivo_no_corriente')
      .map((fila) => ({
        codigo: fila.codigo,
        nombre: fila.nombre,
        importe: importeAcreedor(fila),
      }))
      .filter((linea) => linea.importe !== 0),
  )

  const patrimonioNeto = ordenarLineasEstados(
    balance.filas
      .filter((fila) => fila.rubro === 'patrimonio')
      .map((fila) => ({
        codigo: fila.codigo,
        nombre: fila.nombre,
        importe: importeAcreedor(fila),
      }))
      .filter((linea) => linea.importe !== 0),
  )

  if (!cuentasPorCodigo.has(CODIGOS.CAPITAL)) {
    throw new Error('El plan de cuentas no contiene la cuenta de capital.')
  }

  patrimonioNeto.push({
    codigo: '3.3',
    nombre: 'Resultado del ejercicio',
    importe: resultado.resultadoEjercicio,
  })

  const totalActivoCorriente = activoCorriente.reduce((total, linea) => total + linea.importe, 0)
  const totalActivoNoCorriente = activoNoCorriente.reduce(
    (total, linea) => total + linea.importe,
    0,
  )
  const totalActivo = totalActivoCorriente + totalActivoNoCorriente
  const totalPasivoCorriente = pasivoCorriente.reduce((total, linea) => total + linea.importe, 0)
  const totalPasivoNoCorriente = pasivoNoCorriente.reduce(
    (total, linea) => total + linea.importe,
    0,
  )
  const totalPasivo = totalPasivoCorriente + totalPasivoNoCorriente
  const totalPatrimonioNeto = patrimonioNeto.reduce((total, linea) => total + linea.importe, 0)
  const totalPasivoYPatrimonioNeto = totalPasivo + totalPatrimonioNeto
  const diferencia = totalActivo - totalPasivoYPatrimonioNeto

  return {
    activoCorriente,
    activoNoCorriente,
    totalActivoCorriente,
    totalActivoNoCorriente,
    totalActivo,
    pasivoCorriente,
    pasivoNoCorriente,
    totalPasivoCorriente,
    totalPasivoNoCorriente,
    totalPasivo,
    patrimonioNeto,
    totalPatrimonioNeto,
    totalPasivoYPatrimonioNeto,
    ecuacionVerificada: diferencia === 0,
    diferencia,
  }
}

/* -------------------------------------------------------------------------- */
/* Estado de Flujo de Efectivo                                                */
/* -------------------------------------------------------------------------- */

const CUENTAS_EFECTIVO = new Set<string>([CODIGOS.CAJA, CODIGOS.BANCO])

const ORDEN_FLUJO_OPERATIVO = [
  'Cobros de clientes',
  'Otros ingresos operativos',
  'Pagos a proveedores',
  'Pagos de gastos operativos',
  'Pagos de impuestos',
  'Otros egresos operativos',
] as const

const ORDEN_FLUJO_INVERSION = [
  'Ventas de bienes de uso',
  'Compras de bienes de uso',
  'Otros ingresos de inversión',
  'Otros egresos de inversión',
] as const

const ORDEN_FLUJO_FINANCIACION = [
  'Aportes de capital',
  'Préstamos obtenidos',
  'Pagos de préstamos',
  'Distribuciones de capital',
  'Otros ingresos de financiación',
  'Otros egresos de financiación',
] as const

function incrementarImporte(mapa: Map<string, number>, clave: string, importe: number): void {
  mapa.set(clave, (mapa.get(clave) ?? 0) + importe)
}

function lineasDesdeMapa(
  mapa: Map<string, number>,
  orden: readonly string[],
  prefijo: string,
): LineaEstado[] {
  const etiquetas = [
    ...orden.filter((etiqueta) => mapa.has(etiqueta)),
    ...[...mapa.keys()].filter((etiqueta) => !orden.includes(etiqueta)),
  ]

  return etiquetas.map((etiqueta, indice) => ({
    codigo: `${prefijo}-${indice + 1}`,
    nombre: etiqueta,
    importe: mapa.get(etiqueta) ?? 0,
  }))
}

function efectivoDelAsiento(asiento: Asiento): number {
  return asiento.lineas.reduce((total, linea) => {
    if (!CUENTAS_EFECTIVO.has(linea.cuentaId)) return total
    return total + linea.debe - linea.haber
  }, 0)
}

const CUENTAS_IMPOSITIVAS = new Set<string>([
  CODIGOS.IVA_CREDITO,
  CODIGOS.IVA_SALDO_FAVOR,
  CODIGOS.IVA_DEBITO,
  CODIGOS.IVA_A_PAGAR,
  CODIGOS.IMPUESTO_GANANCIAS,
  CODIGOS.IMPUESTO_GANANCIAS_A_PAGAR,
])

function esCuentaImpositiva(codigo: string): boolean {
  return CUENTAS_IMPOSITIVAS.has(codigo)
}

function clasificarFlujo(
  asiento: Asiento,
  flujo: number,
  rubros: ReadonlySet<string>,
  cuentasContrapartida: ReadonlySet<string>,
): { actividad: 'operativa' | 'inversion' | 'financiacion'; etiqueta: string } {
  if (rubros.has('activo_no_corriente')) {
    return {
      actividad: 'inversion',
      etiqueta: flujo > 0 ? 'Ventas de bienes de uso' : 'Compras de bienes de uso',
    }
  }

  if (rubros.has('patrimonio') || rubros.has('pasivo_no_corriente')) {
    if (rubros.has('patrimonio')) {
      return {
        actividad: 'financiacion',
        etiqueta: flujo > 0 ? 'Aportes de capital' : 'Distribuciones de capital',
      }
    }
    return {
      actividad: 'financiacion',
      etiqueta: flujo > 0 ? 'Préstamos obtenidos' : 'Pagos de préstamos',
    }
  }

  if (flujo > 0) {
    return {
      actividad: 'operativa',
      etiqueta:
        asiento.origen === 'cobro' || asiento.origen === 'venta'
          ? 'Cobros de clientes'
          : 'Otros ingresos operativos',
    }
  }

  if (asiento.origen === 'pago' || asiento.origen === 'compra') {
    return { actividad: 'operativa', etiqueta: 'Pagos a proveedores' }
  }

  if (asiento.origen === 'gasto' || rubros.has('gasto_operativo')) {
    return { actividad: 'operativa', etiqueta: 'Pagos de gastos operativos' }
  }

  const pagaImpuestos =
    asiento.origen === 'impuesto' ||
    rubros.has('impuesto') ||
    [...cuentasContrapartida].some((codigo) => esCuentaImpositiva(codigo))

  return {
    actividad: 'operativa',
    etiqueta: pagaImpuestos ? 'Pagos de impuestos' : 'Otros egresos operativos',
  }
}

/**
 * Deriva el Estado de Flujo de Efectivo por el método directo a partir de los
 * asientos registrados. La apertura se presenta como saldo inicial y las
 * transferencias internas entre caja y banco no generan flujo.
 */
export function derivarEstadoFlujoEfectivo(
  balance: BalanceComprobacion,
  cuentas: readonly Cuenta[],
  asientos: readonly Asiento[],
  rango?: RangoFechas,
): EstadoFlujoEfectivo {
  const cuentasPorCodigo = mapaCuentas(cuentas)
  const registrados = asientos.filter((asiento) => asiento.estado === 'registrado')

  const apertura = registrados.filter((asiento) => asiento.origen === 'apertura')
  const anteriores = registrados.filter(
    (asiento) => asiento.origen !== 'apertura' && antesDelRango(asiento.fecha, rango),
  )
  const saldoInicial = [...apertura, ...anteriores].reduce(
    (total, asiento) => total + efectivoDelAsiento(asiento),
    0,
  )

  const operativas = new Map<string, number>()
  const inversiones = new Map<string, number>()
  const financiaciones = new Map<string, number>()

  for (const asiento of registrados) {
    if (asiento.origen === 'apertura') continue
    if (!dentroDelRango(asiento.fecha, rango)) continue

    const flujo = efectivoDelAsiento(asiento)
    if (flujo === 0) continue

    const lineasContrapartida = asiento.lineas.filter(
      (linea) => !CUENTAS_EFECTIVO.has(linea.cuentaId) && (linea.debe > 0 || linea.haber > 0),
    )
    const rubros = new Set(
      lineasContrapartida
        .map((linea) => cuentasPorCodigo.get(linea.cuentaId)?.rubro)
        .filter((rubro): rubro is NonNullable<typeof rubro> => Boolean(rubro)),
    )
    const cuentasContrapartida = new Set(lineasContrapartida.map((linea) => linea.cuentaId))
    const { actividad, etiqueta } = clasificarFlujo(asiento, flujo, rubros, cuentasContrapartida)

    if (actividad === 'inversion') incrementarImporte(inversiones, etiqueta, flujo)
    else if (actividad === 'financiacion') incrementarImporte(financiaciones, etiqueta, flujo)
    else incrementarImporte(operativas, etiqueta, flujo)
  }

  const actividadesOperativas = lineasDesdeMapa(operativas, ORDEN_FLUJO_OPERATIVO, 'FO')
  const actividadesInversion = lineasDesdeMapa(inversiones, ORDEN_FLUJO_INVERSION, 'FI')
  const actividadesFinanciacion = lineasDesdeMapa(financiaciones, ORDEN_FLUJO_FINANCIACION, 'FF')

  const totalActividadesOperativas = actividadesOperativas.reduce(
    (total, linea) => total + linea.importe,
    0,
  )
  const totalActividadesInversion = actividadesInversion.reduce(
    (total, linea) => total + linea.importe,
    0,
  )
  const totalActividadesFinanciacion = actividadesFinanciacion.reduce(
    (total, linea) => total + linea.importe,
    0,
  )
  const variacionNeta =
    totalActividadesOperativas + totalActividadesInversion + totalActividadesFinanciacion
  const saldoFinal = saldoInicial + variacionNeta

  const saldoContable = balance.filas
    .filter((fila) => CUENTAS_EFECTIVO.has(fila.cuentaId))
    .reduce((total, fila) => total + fila.saldoDeudor - fila.saldoAcreedor, 0)

  return {
    saldoInicial,
    actividadesOperativas,
    totalActividadesOperativas,
    actividadesInversion,
    totalActividadesInversion,
    actividadesFinanciacion,
    totalActividadesFinanciacion,
    variacionNeta,
    saldoFinal,
    saldoContable,
    conciliado: saldoFinal === saldoContable,
    diferencia: saldoFinal - saldoContable,
  }
}

/* -------------------------------------------------------------------------- */
/* Estado de Evolución del Patrimonio Neto                                    */
/* -------------------------------------------------------------------------- */

function variacionPatrimonio(
  asientos: readonly Asiento[],
  cuentasPatrimonio: ReadonlySet<string>,
  cuentasCapital: ReadonlySet<string>,
  soloCapital: boolean,
): number {
  let total = 0

  for (const asiento of asientos) {
    for (const linea of asiento.lineas) {
      if (!cuentasPatrimonio.has(linea.cuentaId)) continue
      const esCapital = cuentasCapital.has(linea.cuentaId)
      if (soloCapital !== esCapital) continue
      total += linea.haber - linea.debe
    }
  }

  return total
}

/**
 * Deriva la evolución del patrimonio neto a partir del Balance de Comprobación,
 * el resultado del ejercicio y los movimientos registrados en cuentas de
 * patrimonio. El saldo final se concilia con el Estado de Situación Patrimonial.
 */
export function derivarEstadoEvolucionPatrimonioNeto(
  balance: BalanceComprobacion,
  cuentas: readonly Cuenta[],
  resultado: EstadoResultados,
  asientos: readonly Asiento[],
  rango?: RangoFechas,
): EstadoEvolucionPatrimonioNeto {
  const cuentasPatrimonio = new Set(
    cuentas
      .filter((cuenta) => cuenta.imputable && cuenta.rubro === 'patrimonio')
      .map((cuenta) => cuenta.codigo),
  )
  const cuentasCapital = new Set(
    cuentas
      .filter((cuenta) => cuenta.imputable && cuenta.codigo === CODIGOS.CAPITAL)
      .map((cuenta) => cuenta.codigo),
  )

  const registrados = asientos.filter((asiento) => asiento.estado === 'registrado')
  const anteriores = registrados.filter((asiento) => antesDelRango(asiento.fecha, rango))
  const enPeriodo = registrados.filter((asiento) => dentroDelRango(asiento.fecha, rango))

  const capitalInicial = variacionPatrimonio(anteriores, cuentasPatrimonio, cuentasCapital, true)
  const resultadosAcumuladosIniciales = variacionPatrimonio(
    anteriores,
    cuentasPatrimonio,
    cuentasCapital,
    false,
  )
  const aportesCapital = variacionPatrimonio(enPeriodo, cuentasPatrimonio, cuentasCapital, true)
  const movimientosResultados = variacionPatrimonio(
    enPeriodo,
    cuentasPatrimonio,
    cuentasCapital,
    false,
  )

  const capitalFinal = capitalInicial + aportesCapital
  const resultadosAcumuladosFinales = resultadosAcumuladosIniciales + movimientosResultados
  const resultadoEjercicio = resultado.resultadoEjercicio
  const saldoInicial = capitalInicial + resultadosAcumuladosIniciales
  const saldoFinal = capitalFinal + resultadosAcumuladosFinales + resultadoEjercicio

  const capitalSegunBalance = balance.filas
    .filter((fila) => cuentasCapital.has(fila.cuentaId))
    .reduce((total, fila) => total + importeAcreedor(fila), 0)
  const resultadosSegunBalance = balance.filas
    .filter((fila) => cuentasPatrimonio.has(fila.cuentaId) && !cuentasCapital.has(fila.cuentaId))
    .reduce((total, fila) => total + importeAcreedor(fila), 0)
  const totalPatrimonioNeto = capitalSegunBalance + resultadosSegunBalance + resultadoEjercicio

  const filas: FilaEvolucionPatrimonioNeto[] = [
    {
      concepto: 'Saldo inicial',
      capital: capitalInicial,
      resultadosAcumulados: resultadosAcumuladosIniciales,
      resultadoEjercicio: 0,
      total: saldoInicial,
      tipo: 'saldo_inicial',
    },
    {
      concepto: 'Aportes de capital',
      capital: aportesCapital,
      resultadosAcumulados: 0,
      resultadoEjercicio: 0,
      total: aportesCapital,
      tipo: 'movimiento',
    },
    {
      concepto: 'Movimientos de resultados acumulados',
      capital: 0,
      resultadosAcumulados: movimientosResultados,
      resultadoEjercicio: 0,
      total: movimientosResultados,
      tipo: 'movimiento',
    },
    {
      concepto: 'Resultado del ejercicio',
      capital: 0,
      resultadosAcumulados: 0,
      resultadoEjercicio,
      total: resultadoEjercicio,
      tipo: 'resultado',
    },
    {
      concepto: 'Saldo final',
      capital: capitalFinal,
      resultadosAcumulados: resultadosAcumuladosFinales,
      resultadoEjercicio,
      total: saldoFinal,
      tipo: 'saldo_final',
    },
  ]

  return {
    filas,
    saldoInicial,
    capitalInicial,
    resultadosAcumuladosIniciales,
    aportesCapital,
    movimientosResultados,
    resultadoEjercicio,
    saldoFinal,
    capitalFinal,
    resultadosAcumuladosFinales,
    totalPatrimonioNeto,
    conciliado: saldoFinal === totalPatrimonioNeto,
    diferencia: saldoFinal - totalPatrimonioNeto,
  }
}

/* -------------------------------------------------------------------------- */
/* Tesorería                                                                  */
/* -------------------------------------------------------------------------- */

function origenMovimiento(origen: Asiento['origen']): OrigenMovimiento {
  switch (origen) {
    case 'apertura':
      return 'apertura'
    case 'pago':
    case 'compra':
      return 'pago'
    case 'cobro':
    case 'venta':
      return 'cobro'
    case 'transferencia':
      return 'transferencia'
    case 'gasto':
      return 'gasto'
    case 'amortizacion':
    case 'ajuste':
    case 'impuesto':
      return 'ajuste'
  }
}

/**
 * Deriva los movimientos de caja y banco desde los asientos registrados.
 * Permite verificar que la tesorería y la contabilidad cuenten la misma historia.
 */
export function derivarMovimientosTesoreria(asientos: readonly Asiento[]): MovimientoTesoreria[] {
  const movimientos: MovimientoTesoreria[] = []

  for (const asiento of ordenarAsientos(
    asientos.filter((asientoContable) => asientoContable.estado === 'registrado'),
  )) {
    asiento.lineas.forEach((linea, indice) => {
      if (!CUENTAS_TESORERIA.has(linea.cuentaId)) return

      const importe = linea.debe > 0 ? linea.debe : linea.haber
      if (importe <= 0) return

      movimientos.push({
        id: `mov-${asiento.id}-${indice}`,
        fecha: asiento.fecha,
        descripcion: asiento.concepto,
        cuentaId: linea.cuentaId,
        tipo: linea.debe > 0 ? 'ingreso' : 'egreso',
        importe,
        origen: origenMovimiento(asiento.origen),
        origenId: asiento.origenId ?? asiento.id,
        documentoId: asiento.documentoId,
        asientoId: asiento.id,
      })
    })
  }

  return movimientos
}

/** Calcula saldos de caja y banco a partir de los movimientos de tesorería. */
export function derivarSaldosTesoreria(
  movimientos: readonly MovimientoTesoreria[],
): SaldoTesoreria[] {
  const cuentas = [CODIGOS.CAJA, CODIGOS.BANCO]

  return cuentas.map((cuentaId) => {
    const movimientosCuenta = movimientos.filter((movimiento) => movimiento.cuentaId === cuentaId)
    const saldoInicial = movimientosCuenta
      .filter((movimiento) => movimiento.origen === 'apertura')
      .reduce(
        (total, movimiento) =>
          total + (movimiento.tipo === 'ingreso' ? movimiento.importe : -movimiento.importe),
        0,
      )
    const ingresos = movimientosCuenta
      .filter((movimiento) => movimiento.origen !== 'apertura' && movimiento.tipo === 'ingreso')
      .reduce((total, movimiento) => total + movimiento.importe, 0)
    const egresos = movimientosCuenta
      .filter((movimiento) => movimiento.origen !== 'apertura' && movimiento.tipo === 'egreso')
      .reduce((total, movimiento) => total + movimiento.importe, 0)

    return {
      cuentaId,
      saldoInicial,
      ingresos,
      egresos,
      saldoFinal: saldoInicial + ingresos - egresos,
    }
  })
}

/* -------------------------------------------------------------------------- */
/* Stock y saldos de terceros                                                 */
/* -------------------------------------------------------------------------- */

/** Deriva el stock por producto a partir de las operaciones recibidas. */
export function derivarStock(
  productos: readonly Producto[],
  compras: readonly Compra[],
  ventas: readonly Venta[],
): StockProducto[] {
  const movimientos = new Map<string, { compras: number; ventas: number }>()

  for (const producto of productos) {
    movimientos.set(producto.id, { compras: 0, ventas: 0 })
  }

  for (const compra of compras) {
    for (const item of compra.items) {
      const actual = movimientos.get(item.productoId)
      if (actual) actual.compras += item.cantidad
    }
  }

  for (const venta of ventas) {
    for (const item of venta.items) {
      const actual = movimientos.get(item.productoId)
      if (actual) actual.ventas += item.cantidad
    }
  }

  return productos.map((producto) => {
    const movimiento = movimientos.get(producto.id) ?? { compras: 0, ventas: 0 }
    const stockFinal = producto.stockInicial + movimiento.compras - movimiento.ventas

    return {
      productoId: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      stockInicial: producto.stockInicial,
      compras: movimiento.compras,
      ventas: movimiento.ventas,
      stockFinal,
      costoUnitario: producto.costo,
      valorStock: stockFinal * producto.costo,
    }
  })
}

export function saldoPendienteCompra(compra: Compra, pagos: readonly Pago[]): number {
  const pagado = pagos
    .filter((pago) => pago.compraId === compra.id)
    .reduce((total, pago) => total + pago.importe, 0)
  return compra.total - pagado
}

export function saldoPendienteVenta(venta: Venta, cobros: readonly Cobro[]): number {
  const cobrado = cobros
    .filter((cobro) => cobro.ventaId === venta.id)
    .reduce((total, cobro) => total + cobro.importe, 0)
  return venta.total - cobrado
}

export function estadoPagoCompra(compra: Compra, pagos: readonly Pago[]): Compra['estado'] {
  const pendiente = saldoPendienteCompra(compra, pagos)
  if (pendiente <= 0) return 'pagada'
  if (pendiente < compra.total) return 'parcial'
  return 'pendiente'
}

export function estadoCobroVenta(venta: Venta, cobros: readonly Cobro[]): Venta['estado'] {
  const pendiente = saldoPendienteVenta(venta, cobros)
  if (pendiente <= 0) return 'cobrada'
  if (pendiente < venta.total) return 'parcial'
  return 'pendiente'
}

function documentosRegistrados(documentos: readonly DocumentoContable[]): Set<string> {
  return new Set(
    documentos
      .filter((documento) => documento.estado === 'registrado')
      .map((documento) => documento.id),
  )
}

/** Saldos de proveedores según las compras y pagos ya registrados. */
export function derivarSaldosProveedores(
  proveedores: readonly Proveedor[],
  compras: readonly Compra[],
  pagos: readonly Pago[],
  documentos: readonly DocumentoContable[],
): SaldoTercero[] {
  const registrados = documentosRegistrados(documentos)

  return proveedores.map((proveedor) => {
    const comprasProveedor = compras
      .filter(
        (compra) => compra.proveedorId === proveedor.id && registrados.has(compra.documentoId),
      )
      .reduce((total, compra) => total + compra.total, 0)
    const pagosProveedor = pagos
      .filter((pago) => pago.proveedorId === proveedor.id && registrados.has(pago.documentoId))
      .reduce((total, pago) => total + pago.importe, 0)

    return {
      id: proveedor.id,
      nombre: proveedor.nombre,
      saldo: comprasProveedor - pagosProveedor,
    }
  })
}

/** Saldos de clientes según las ventas y cobros ya registrados. */
export function derivarSaldosClientes(
  clientes: readonly Cliente[],
  ventas: readonly Venta[],
  cobros: readonly Cobro[],
  documentos: readonly DocumentoContable[],
): SaldoTercero[] {
  const registrados = documentosRegistrados(documentos)

  return clientes.map((cliente) => {
    const ventasCliente = ventas
      .filter((venta) => venta.clienteId === cliente.id && registrados.has(venta.documentoId))
      .reduce((total, venta) => total + venta.total, 0)
    const cobrosCliente = cobros
      .filter((cobro) => cobro.clienteId === cliente.id && registrados.has(cobro.documentoId))
      .reduce((total, cobro) => total + cobro.importe, 0)

    return {
      id: cliente.id,
      nombre: cliente.nombre,
      saldo: ventasCliente - cobrosCliente,
    }
  })
}
