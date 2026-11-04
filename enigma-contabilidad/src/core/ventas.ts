import { calcularTotales } from '@/core/dinero'
import { generarAsientoVenta } from '@/core/contabilidad/asientos'
import { estadoCobroVenta, saldoPendienteVenta } from '@/core/contabilidad/derivaciones'
import type { FechaISO } from '@/types'
import type {
  Asiento,
  Venta,
  DocumentoContable,
  EstadoDocumento,
  EstadoCobro,
  ItemVenta,
  Cobro,
  Cliente,
} from '@/types/contabilidad'

/* -------------------------------------------------------------------------- */
/* Catálogos del formulario                                                   */
/* -------------------------------------------------------------------------- */

export const TIPOS_COMPROBANTE_VENTA = [
  'Factura A',
  'Factura B',
  'Factura C',
  'Nota de Crédito A',
  'Nota de Débito A',
] as const

export type TipoComprobanteVenta = (typeof TIPOS_COMPROBANTE_VENTA)[number]

export const ALICUOTAS_IVA_VENTA = [21, 10.5, 0] as const

const PREFIJOS_COMPROBANTE: Record<TipoComprobanteVenta, string> = {
  'Factura A': 'FA-A-0001-',
  'Factura B': 'FA-B-0001-',
  'Factura C': 'FA-C-0001-',
  'Nota de Crédito A': 'NC-A-0001-',
  'Nota de Débito A': 'ND-A-0001-',
}

/* -------------------------------------------------------------------------- */
/* Filtros y búsqueda                                                         */
/* -------------------------------------------------------------------------- */

export interface FiltrosVenta {
  texto: string
  desde: string
  hasta: string
  estadoCobro: EstadoCobro | ''
  estadoContable: EstadoDocumento | ''
}

export function filtrosVentaVacios(): FiltrosVenta {
  return {
    texto: '',
    desde: '',
    hasta: '',
    estadoCobro: '',
    estadoContable: '',
  }
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function estadoContableVenta(
  venta: Venta,
  documentos: readonly DocumentoContable[],
): EstadoDocumento {
  return documentos.find((documento) => documento.id === venta.documentoId)?.estado ?? 'pendiente'
}

/**
 * Busca por cliente, CUIT, número o tipo de comprobante y aplica los filtros
 * de fecha y estado. El resultado queda ordenado de la operación más reciente a
 * la más antigua.
 */
export function filtrarVentas(
  ventas: readonly Venta[],
  clientes: readonly Cliente[],
  cobros: readonly Cobro[],
  documentos: readonly DocumentoContable[],
  filtros: FiltrosVenta,
): Venta[] {
  const clientesPorId = new Map(clientes.map((cliente) => [cliente.id, cliente]))
  const consulta = normalizarTexto(filtros.texto)

  return ventas
    .filter((venta) => {
      const cliente = clientesPorId.get(venta.clienteId)
      const textoCoincide =
        !consulta ||
        [cliente?.nombre ?? '', cliente?.cuit ?? '', venta.numero, venta.tipoComprobante]
          .map(normalizarTexto)
          .some((valor) => valor.includes(consulta))

      if (!textoCoincide) return false
      if (filtros.desde && venta.fecha < filtros.desde) return false
      if (filtros.hasta && venta.fecha > filtros.hasta) return false

      const estadoCobro = estadoCobroVenta(venta, cobros)
      if (filtros.estadoCobro && estadoCobro !== filtros.estadoCobro) return false

      const estadoContable = estadoContableVenta(venta, documentos)
      if (filtros.estadoContable && estadoContable !== filtros.estadoContable) return false

      return true
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
}

export interface ResumenVentas {
  cantidad: number
  total: number
  iva: number
  saldoPendiente: number
  pendientesRegistracion: number
}

export function resumirVentas(
  ventas: readonly Venta[],
  cobros: readonly Cobro[],
  documentos: readonly DocumentoContable[],
): ResumenVentas {
  return ventas.reduce<ResumenVentas>(
    (resumen, venta) => {
      const saldo = saldoPendienteVenta(venta, cobros)

      resumen.cantidad += 1
      resumen.total += venta.total
      resumen.iva += venta.iva
      if (saldo > 0) resumen.saldoPendiente += saldo
      if (estadoContableVenta(venta, documentos) !== 'registrado') {
        resumen.pendientesRegistracion += 1
      }

      return resumen
    },
    { cantidad: 0, total: 0, iva: 0, saldoPendiente: 0, pendientesRegistracion: 0 },
  )
}

/* -------------------------------------------------------------------------- */
/* Numeración y vencimientos                                                  */
/* -------------------------------------------------------------------------- */

export function prefijoComprobanteVenta(tipo: string): string {
  return PREFIJOS_COMPROBANTE[tipo as TipoComprobanteVenta] ?? PREFIJOS_COMPROBANTE['Factura A']
}

/**
 * Calcula el próximo número correlativo para el tipo de comprobante elegido.
 * El sufijo conserva el formato de ocho dígitos usado por los datos demo.
 */
export function siguienteNumeroComprobanteVenta(
  ventas: readonly Venta[],
  tipoComprobante: string,
): string {
  const prefijo = prefijoComprobanteVenta(tipoComprobante)
  let maximo = 0

  for (const venta of ventas) {
    if (!venta.numero.startsWith(prefijo)) continue
    const sufijo = venta.numero.slice(prefijo.length)
    const numero = Number.parseInt(sufijo, 10)
    if (Number.isFinite(numero)) maximo = Math.max(maximo, numero)
  }

  return `${prefijo}${String(maximo + 1).padStart(8, '0')}`
}

export function siguienteIdVenta(ventas: readonly Venta[]): string {
  const maximo = ventas.reduce((max, venta) => {
    const coincidencia = /^V-(\d+)$/.exec(venta.id)
    if (!coincidencia) return max
    return Math.max(max, Number.parseInt(coincidencia[1] ?? '0', 10))
  }, 0)

  return `V-${String(maximo + 1).padStart(3, '0')}`
}

function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const siguiente = new Date(Date.UTC(anio!, mes! - 1, dia! + dias))
  return siguiente.toISOString().slice(0, 10) as FechaISO
}

/** Contado vence el mismo día; cuenta corriente, a los 30 días. */
export function calcularVencimiento(
  fecha: FechaISO,
  condicionVenta: Venta['condicionVenta'],
): FechaISO {
  return condicionVenta === 'contado' ? fecha : sumarDias(fecha, 30)
}

/* -------------------------------------------------------------------------- */
/* Validación                                                                 */
/* -------------------------------------------------------------------------- */

export interface ErroresItemVenta {
  productoId?: string
  descripcion?: string
  cantidad?: string
  precioUnitario?: string
  alicuotaIva?: string
}

export interface ErroresVenta {
  clienteId?: string
  fecha?: string
  vencimiento?: string
  tipoComprobante?: string
  numero?: string
  condicionVenta?: string
  items?: string
  porItem: Record<number, ErroresItemVenta>
}

export interface EntradaValidacionVenta {
  clienteId: string
  fecha: string
  vencimiento: string
  tipoComprobante: string
  numero: string
  condicionVenta: string
  items: readonly ItemVenta[]
}

function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const valor = new Date(Date.UTC(anio!, mes! - 1, dia!))
  return (
    valor.getUTCFullYear() === anio &&
    valor.getUTCMonth() === mes! - 1 &&
    valor.getUTCDate() === dia
  )
}

export function validarVenta(
  entrada: EntradaValidacionVenta,
  ventas: readonly Venta[],
): ErroresVenta {
  const errores: ErroresVenta = { porItem: {} }

  if (!entrada.clienteId) {
    errores.clienteId = 'Seleccioná un cliente.'
  }
  if (!esFechaValida(entrada.fecha)) {
    errores.fecha = 'Ingresá una fecha válida.'
  }
  if (!esFechaValida(entrada.vencimiento)) {
    errores.vencimiento = 'Ingresá un vencimiento válido.'
  } else if (esFechaValida(entrada.fecha) && entrada.vencimiento < entrada.fecha) {
    errores.vencimiento = 'El vencimiento no puede ser anterior a la fecha.'
  }
  if (!entrada.tipoComprobante) {
    errores.tipoComprobante = 'Seleccioná el tipo de comprobante.'
  }
  if (!entrada.numero.trim()) {
    errores.numero = 'El número de comprobante es obligatorio.'
  } else if (ventas.some((venta) => venta.numero === entrada.numero.trim())) {
    errores.numero = 'Ya existe un comprobante con ese número.'
  }
  if (!entrada.condicionVenta) {
    errores.condicionVenta = 'Seleccioná la condición de venta.'
  }
  if (entrada.items.length === 0) {
    errores.items = 'Agregá al menos un producto o servicio.'
  }

  entrada.items.forEach((item, indice) => {
    const erroresItem: ErroresItemVenta = {}

    if (!item.productoId) erroresItem.productoId = 'Seleccioná un producto o servicio.'
    if (!item.descripcion.trim()) erroresItem.descripcion = 'Ingresá una descripción.'
    if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      erroresItem.cantidad = 'La cantidad debe ser un entero mayor a cero.'
    }
    if (!Number.isInteger(item.precioUnitario) || item.precioUnitario <= 0) {
      erroresItem.precioUnitario = 'El precio debe ser mayor a cero.'
    }
    if (!Number.isFinite(item.alicuotaIva) || item.alicuotaIva < 0) {
      erroresItem.alicuotaIva = 'Seleccioná una alícuota válida.'
    }

    if (Object.keys(erroresItem).length > 0) {
      errores.porItem[indice] = erroresItem
    }
  })

  return errores
}

export function hayErroresVenta(errores: ErroresVenta): boolean {
  return (
    Boolean(
      errores.clienteId ||
      errores.fecha ||
      errores.vencimiento ||
      errores.tipoComprobante ||
      errores.numero ||
      errores.condicionVenta ||
      errores.items,
    ) || Object.keys(errores.porItem).length > 0
  )
}

/* -------------------------------------------------------------------------- */
/* Generación de la operación                                                 */
/* -------------------------------------------------------------------------- */

export interface DatosNuevaVenta {
  cliente: Cliente
  fecha: FechaISO
  vencimiento: FechaISO
  tipoComprobante: string
  numero: string
  condicionVenta: Venta['condicionVenta']
  items: ItemVenta[]
}

export interface VentaGenerada {
  venta: Venta
  asiento: Asiento
  documento: DocumentoContable
}

/**
 * Construye la venta, su asiento propuesto y el documento pendiente que
 * ingresará a la bandeja de Contaduría. Los importes se calculan con la misma
 * función que usa el resto del sistema para respetar el redondeo al centavo.
 */
export function generarVenta(datos: DatosNuevaVenta, id: string): VentaGenerada {
  const totales = calcularTotales(datos.items)
  const venta: Venta = {
    id,
    numero: datos.numero,
    fecha: datos.fecha,
    vencimiento: datos.vencimiento,
    clienteId: datos.cliente.id,
    tipoComprobante: datos.tipoComprobante,
    condicionVenta: datos.condicionVenta,
    items: datos.items,
    subtotal: totales.subtotal,
    iva: totales.iva,
    total: totales.total,
    estado: 'pendiente',
    documentoId: `doc-venta-${id}`,
    asientoId: `asiento-venta-${id}`,
  }

  const asiento = generarAsientoVenta(venta, `Venta ${venta.numero} - ${datos.cliente.nombre}`)

  const documento: DocumentoContable = {
    id: venta.documentoId,
    numero: venta.numero,
    tipo: 'factura_emitida',
    origen: 'ventas',
    fecha: venta.fecha,
    descripcion: `Factura emitida ${venta.numero} - ${datos.cliente.nombre}`,
    contraparte: datos.cliente.nombre,
    importe: venta.total,
    estado: 'pendiente',
    asientoId: venta.asientoId,
    operacionId: venta.id,
  }

  return { venta, asiento, documento }
}

/* -------------------------------------------------------------------------- */
/* Cuentas por pagar                                                          */
/* -------------------------------------------------------------------------- */

export interface CuentaPorCobrar {
  clienteId: string
  cliente: string
  cuit: string
  comprobantes: number
  vencimiento: FechaISO | null
  saldo: number
}

/**
 * Agrupa las obligaciones pendientes por cliente. Solo considera documentos
 * ya registrados, igual que los saldos contables de terceros.
 */
export function agruparCuentasPorCobrar(
  ventas: readonly Venta[],
  clientes: readonly Cliente[],
  cobros: readonly Cobro[],
  documentos: readonly DocumentoContable[],
): CuentaPorCobrar[] {
  const registrados = new Set(
    documentos
      .filter((documento) => documento.estado === 'registrado')
      .map((documento) => documento.id),
  )
  const clientesPorId = new Map(clientes.map((cliente) => [cliente.id, cliente]))
  const agrupadas = new Map<string, CuentaPorCobrar>()

  for (const venta of ventas) {
    if (!registrados.has(venta.documentoId)) continue
    const saldo = saldoPendienteVenta(venta, cobros)
    if (saldo <= 0) continue

    const cliente = clientesPorId.get(venta.clienteId)
    if (!cliente) continue

    const actual = agrupadas.get(cliente.id)
    if (actual) {
      actual.comprobantes += 1
      actual.saldo += saldo
      if (!actual.vencimiento || venta.vencimiento < actual.vencimiento) {
        actual.vencimiento = venta.vencimiento
      }
    } else {
      agrupadas.set(cliente.id, {
        clienteId: cliente.id,
        cliente: cliente.nombre,
        cuit: cliente.cuit,
        comprobantes: 1,
        vencimiento: venta.vencimiento,
        saldo,
      })
    }
  }

  return [...agrupadas.values()].sort((a, b) => b.saldo - a.saldo)
}

/* -------------------------------------------------------------------------- */
/* Etiquetas de estado                                                        */
/* -------------------------------------------------------------------------- */

export function etiquetaEstadoCobro(estado: EstadoCobro): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente'
    case 'parcial':
      return 'Parcial'
    case 'cobrada':
      return 'Cobrada'
  }
}

export function etiquetaEstadoContable(estado: EstadoDocumento): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente de revisión'
    case 'en_revision':
      return 'En revisión'
    case 'aprobado':
      return 'Aprobado'
    case 'registrado':
      return 'Registrado'
    case 'observado':
      return 'Observado'
  }
}
