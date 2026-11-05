import type { FechaISO, Periodo } from '@/types'

/* -------------------------------------------------------------------------- */
/* Plan de cuentas                                                            */
/* -------------------------------------------------------------------------- */

export type TipoCuenta = 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'gasto'

export type NaturalezaCuenta = 'deudora' | 'acreedora'

/**
 * Rubro usado por los estados contables. Las cuentas de agrupación no tienen
 * rubro porque no reciben imputaciones.
 */
export type RubroCuenta =
  | 'activo_corriente'
  | 'activo_no_corriente'
  | 'pasivo_corriente'
  | 'pasivo_no_corriente'
  | 'patrimonio'
  | 'ingreso'
  | 'costo'
  | 'gasto_operativo'
  | 'impuesto'

export interface Cuenta {
  codigo: string
  nombre: string
  tipo: TipoCuenta
  naturaleza: NaturalezaCuenta
  rubro: RubroCuenta | null
  padre: string | null
  imputable: boolean
  descripcion?: string
}

export interface CuentaArbol extends Cuenta {
  hijos: CuentaArbol[]
}

/* -------------------------------------------------------------------------- */
/* Maestros                                                                   */
/* -------------------------------------------------------------------------- */

export type CondicionIva = 'Responsable Inscripto' | 'Monotributo' | 'Exento'

export interface Proveedor {
  id: string
  nombre: string
  cuit: string
  email: string
  telefono: string
  direccion: string
  condicionIva: CondicionIva
}

export interface Cliente {
  id: string
  nombre: string
  cuit: string
  email: string
  telefono: string
  direccion: string
  condicionIva: CondicionIva
}

export type TipoProducto = 'producto' | 'servicio'

export interface Producto {
  id: string
  codigo: string
  nombre: string
  tipo: TipoProducto
  precioVenta: number
  costo: number
  alicuotaIva: number
  stockInicial: number
  puntoReposicion: number
  cuentaCompra: string
  cuentaIngreso: string
  cuentaCosto: string
}

/* -------------------------------------------------------------------------- */
/* Operaciones comerciales                                                    */
/* -------------------------------------------------------------------------- */

export interface ItemCompra {
  productoId: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  alicuotaIva: number
  /** Mercaderías o cuenta de gasto según el tipo de producto. */
  cuentaContable: string
}

export interface ItemVenta {
  productoId: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  alicuotaIva: number
  costoUnitario: number
  cuentaIngreso: string
  cuentaCosto: string
}

export type EstadoPago = 'pendiente' | 'parcial' | 'pagada'
export type EstadoCobro = 'pendiente' | 'parcial' | 'cobrada'

export interface Compra {
  id: string
  numero: string
  fecha: FechaISO
  vencimiento: FechaISO
  proveedorId: string
  tipoComprobante: string
  condicionPago: 'contado' | 'cuenta_corriente'
  items: ItemCompra[]
  subtotal: number
  iva: number
  total: number
  estado: EstadoPago
  documentoId: string
  asientoId: string
}

export interface Venta {
  id: string
  numero: string
  fecha: FechaISO
  vencimiento: FechaISO
  clienteId: string
  tipoComprobante: string
  condicionVenta: 'contado' | 'cuenta_corriente'
  items: ItemVenta[]
  subtotal: number
  iva: number
  total: number
  estado: EstadoCobro
  documentoId: string
  asientoId: string
}

export type MedioPago = 'banco' | 'caja' | 'cheque'

export interface Pago {
  id: string
  numero: string
  fecha: FechaISO
  compraId: string
  proveedorId: string
  importe: number
  medio: MedioPago
  cuentaId: string
  observaciones: string
  documentoId: string
  asientoId: string
}

export interface Cobro {
  id: string
  numero: string
  fecha: FechaISO
  ventaId: string
  clienteId: string
  importe: number
  medio: MedioPago
  cuentaId: string
  observaciones: string
  documentoId: string
  asientoId: string
}

export interface Transferencia {
  id: string
  numero: string
  fecha: FechaISO
  cuentaOrigenId: string
  cuentaDestinoId: string
  importe: number
  descripcion: string
  documentoId: string
  asientoId: string
}

/* -------------------------------------------------------------------------- */
/* Tesorería                                                                  */
/* -------------------------------------------------------------------------- */

export type OrigenMovimiento = 'apertura' | 'pago' | 'cobro' | 'transferencia' | 'gasto' | 'ajuste'

export interface MovimientoTesoreria {
  id: string
  fecha: FechaISO
  descripcion: string
  cuentaId: string
  tipo: 'ingreso' | 'egreso'
  importe: number
  origen: OrigenMovimiento
  origenId: string
  documentoId: string | null
  asientoId: string | null
}

export interface SaldoTesoreria {
  cuentaId: string
  saldoInicial: number
  ingresos: number
  egresos: number
  saldoFinal: number
}

/* -------------------------------------------------------------------------- */
/* Contabilidad                                                               */
/* -------------------------------------------------------------------------- */

export type OrigenAsiento =
  | 'apertura'
  | 'compra'
  | 'venta'
  | 'pago'
  | 'cobro'
  | 'transferencia'
  | 'amortizacion'
  | 'gasto'
  | 'ajuste'
  | 'impuesto'

export type EstadoAsiento = 'propuesto' | 'registrado' | 'anulado'

export interface LineaAsiento {
  cuentaId: string
  debe: number
  haber: number
  detalle?: string
}

export interface Asiento {
  id: string
  numero: number | null
  fecha: FechaISO
  concepto: string
  origen: OrigenAsiento
  origenId: string | null
  documentoId: string | null
  estado: EstadoAsiento
  fechaRegistro: FechaISO | null
  lineas: LineaAsiento[]
}

export type OrigenDocumento = 'apertura' | 'compras' | 'ventas' | 'tesoreria' | 'contaduria'

export type TipoDocumento =
  | 'factura_recibida'
  | 'factura_emitida'
  | 'comprobante_pago'
  | 'recibo'
  | 'transferencia'
  | 'asiento_apertura'
  | 'asiento_ajuste'
  | 'liquidacion_iva'
  | 'provision_impuesto'

export type EstadoDocumento = 'pendiente' | 'en_revision' | 'aprobado' | 'registrado' | 'observado'

export interface DocumentoContable {
  id: string
  numero: string
  tipo: TipoDocumento
  origen: OrigenDocumento
  fecha: FechaISO
  descripcion: string
  contraparte: string | null
  importe: number
  estado: EstadoDocumento
  asientoId: string
  operacionId: string | null
  motivoObservacion?: string | null
}

/* -------------------------------------------------------------------------- */
/* Estado general                                                             */
/* -------------------------------------------------------------------------- */

export interface DatosEmpresa {
  razonSocial: string
  nombreComercial: string
  cuit: string
  actividad: string
  direccion: string
  telefono: string
  email: string
  logoDataUrl: string | null
}

export interface EstadoContable {
  version: number
  empresa: DatosEmpresa
  periodo: Periodo
  cuentas: Cuenta[]
  proveedores: Proveedor[]
  clientes: Cliente[]
  productos: Producto[]
  compras: Compra[]
  ventas: Venta[]
  pagos: Pago[]
  cobros: Cobro[]
  transferencias: Transferencia[]
  movimientos: MovimientoTesoreria[]
  documentos: DocumentoContable[]
  asientos: Asiento[]
}

/* -------------------------------------------------------------------------- */
/* Resultados derivados                                                       */
/* -------------------------------------------------------------------------- */

export interface FilaLibroDiario {
  asientoId: string
  numeroAsiento: number
  fecha: FechaISO
  concepto: string
  origen: OrigenAsiento
  cuentaId: string
  cuentaNombre: string
  detalle: string
  debe: number
  haber: number
}

export interface LibroDiario {
  asientos: Asiento[]
  filas: FilaLibroDiario[]
  totalDebe: number
  totalHaber: number
  balanceado: boolean
}

export interface MovimientoMayor {
  asientoId: string
  numeroAsiento: number
  fecha: FechaISO
  concepto: string
  debe: number
  haber: number
  /** Saldo acumulado con convención deudora (debe - haber). */
  saldo: number
}

export interface MayorCuenta {
  cuenta: Cuenta
  saldoInicial: number
  movimientos: MovimientoMayor[]
  totalDebe: number
  totalHaber: number
  saldoFinal: number
}

export type LibroMayor = Record<string, MayorCuenta>

export interface FilaBalanceComprobacion {
  cuentaId: string
  codigo: string
  nombre: string
  tipo: TipoCuenta
  naturaleza: NaturalezaCuenta
  rubro: RubroCuenta | null
  sumaDebe: number
  sumaHaber: number
  saldoDeudor: number
  saldoAcreedor: number
}

export interface BalanceComprobacion {
  filas: FilaBalanceComprobacion[]
  totalSumaDebe: number
  totalSumaHaber: number
  totalSaldoDeudor: number
  totalSaldoAcreedor: number
  balanceado: boolean
}

export interface LineaEstado {
  codigo: string
  nombre: string
  importe: number
}

export interface EstadoResultados {
  ingresos: LineaEstado[]
  /** Ventas de mercaderías (cuenta 4.1). */
  ventasNetas: number
  /** Ventas más servicios y otros ingresos. */
  totalIngresos: number
  costoVentas: number
  resultadoBruto: number
  gastosOperativos: LineaEstado[]
  totalGastosOperativos: number
  resultadoOperativo: number
  resultadoAntesImpuestos: number
  impuestoGanancias: number
  resultadoEjercicio: number
}

export interface EstadoSituacionPatrimonial {
  activoCorriente: LineaEstado[]
  activoNoCorriente: LineaEstado[]
  totalActivoCorriente: number
  totalActivoNoCorriente: number
  totalActivo: number
  pasivoCorriente: LineaEstado[]
  pasivoNoCorriente: LineaEstado[]
  totalPasivoCorriente: number
  totalPasivoNoCorriente: number
  totalPasivo: number
  patrimonioNeto: LineaEstado[]
  totalPatrimonioNeto: number
  totalPasivoYPatrimonioNeto: number
  ecuacionVerificada: boolean
  diferencia: number
}

export interface EstadoFlujoEfectivo {
  saldoInicial: number
  actividadesOperativas: LineaEstado[]
  totalActividadesOperativas: number
  actividadesInversion: LineaEstado[]
  totalActividadesInversion: number
  actividadesFinanciacion: LineaEstado[]
  totalActividadesFinanciacion: number
  variacionNeta: number
  saldoFinal: number
  /** Saldo de caja y banco según el Balance de Comprobación. */
  saldoContable: number
  conciliado: boolean
  diferencia: number
}

export type TipoFilaEvolucionPatrimonio =
  'saldo_inicial' | 'movimiento' | 'resultado' | 'saldo_final'

export interface FilaEvolucionPatrimonioNeto {
  concepto: string
  capital: number
  resultadosAcumulados: number
  resultadoEjercicio: number
  total: number
  tipo: TipoFilaEvolucionPatrimonio
}

export interface EstadoEvolucionPatrimonioNeto {
  filas: FilaEvolucionPatrimonioNeto[]
  saldoInicial: number
  capitalInicial: number
  resultadosAcumuladosIniciales: number
  aportesCapital: number
  movimientosResultados: number
  resultadoEjercicio: number
  saldoFinal: number
  capitalFinal: number
  resultadosAcumuladosFinales: number
  /** Patrimonio neto del Estado de Situación Patrimonial, incluido el resultado. */
  totalPatrimonioNeto: number
  conciliado: boolean
  diferencia: number
}

export interface StockProducto {
  productoId: string
  codigo: string
  nombre: string
  stockInicial: number
  compras: number
  ventas: number
  stockFinal: number
  costoUnitario: number
  valorStock: number
}

export interface SaldoTercero {
  id: string
  nombre: string
  saldo: number
}

export interface ResultadoAprobacion {
  ok: boolean
  duplicado: boolean
  motivo?:
    | 'documento_no_encontrado'
    | 'asiento_no_encontrado'
    | 'documento_observado'
    | 'asiento_desbalanceado'
  asientoId?: string
  numero?: number | null
}
