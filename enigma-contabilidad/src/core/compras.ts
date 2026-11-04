import { calcularTotales } from '@/core/dinero'
import { generarAsientoCompra } from '@/core/contabilidad/asientos'
import { estadoPagoCompra, saldoPendienteCompra } from '@/core/contabilidad/derivaciones'
import type { FechaISO } from '@/types'
import type {
  Asiento,
  Compra,
  DocumentoContable,
  EstadoDocumento,
  EstadoPago,
  ItemCompra,
  Pago,
  Proveedor,
} from '@/types/contabilidad'

/* -------------------------------------------------------------------------- */
/* Catálogos del formulario                                                   */
/* -------------------------------------------------------------------------- */

export const TIPOS_COMPROBANTE_COMPRA = [
  'Factura A',
  'Factura B',
  'Factura C',
  'Nota de Crédito A',
  'Nota de Débito A',
] as const

export type TipoComprobanteCompra = (typeof TIPOS_COMPROBANTE_COMPRA)[number]

export const ALICUOTAS_IVA_COMPRA = [21, 10.5, 0] as const

const PREFIJOS_COMPROBANTE: Record<TipoComprobanteCompra, string> = {
  'Factura A': 'FC-A-0001-',
  'Factura B': 'FC-B-0001-',
  'Factura C': 'FC-C-0001-',
  'Nota de Crédito A': 'NC-A-0001-',
  'Nota de Débito A': 'ND-A-0001-',
}

/* -------------------------------------------------------------------------- */
/* Filtros y búsqueda                                                         */
/* -------------------------------------------------------------------------- */

export interface FiltrosCompra {
  texto: string
  desde: string
  hasta: string
  estadoPago: EstadoPago | ''
  estadoContable: EstadoDocumento | ''
}

export function filtrosCompraVacios(): FiltrosCompra {
  return {
    texto: '',
    desde: '',
    hasta: '',
    estadoPago: '',
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

export function estadoContableCompra(
  compra: Compra,
  documentos: readonly DocumentoContable[],
): EstadoDocumento {
  return documentos.find((documento) => documento.id === compra.documentoId)?.estado ?? 'pendiente'
}

/**
 * Busca por proveedor, CUIT, número o tipo de comprobante y aplica los filtros
 * de fecha y estado. El resultado queda ordenado de la operación más reciente a
 * la más antigua.
 */
export function filtrarCompras(
  compras: readonly Compra[],
  proveedores: readonly Proveedor[],
  pagos: readonly Pago[],
  documentos: readonly DocumentoContable[],
  filtros: FiltrosCompra,
): Compra[] {
  const proveedoresPorId = new Map(proveedores.map((proveedor) => [proveedor.id, proveedor]))
  const consulta = normalizarTexto(filtros.texto)

  return compras
    .filter((compra) => {
      const proveedor = proveedoresPorId.get(compra.proveedorId)
      const textoCoincide =
        !consulta ||
        [proveedor?.nombre ?? '', proveedor?.cuit ?? '', compra.numero, compra.tipoComprobante]
          .map(normalizarTexto)
          .some((valor) => valor.includes(consulta))

      if (!textoCoincide) return false
      if (filtros.desde && compra.fecha < filtros.desde) return false
      if (filtros.hasta && compra.fecha > filtros.hasta) return false

      const estadoPago = estadoPagoCompra(compra, pagos)
      if (filtros.estadoPago && estadoPago !== filtros.estadoPago) return false

      const estadoContable = estadoContableCompra(compra, documentos)
      if (filtros.estadoContable && estadoContable !== filtros.estadoContable) return false

      return true
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
}

export interface ResumenCompras {
  cantidad: number
  total: number
  iva: number
  saldoPendiente: number
  pendientesRegistracion: number
}

export function resumirCompras(
  compras: readonly Compra[],
  pagos: readonly Pago[],
  documentos: readonly DocumentoContable[],
): ResumenCompras {
  return compras.reduce<ResumenCompras>(
    (resumen, compra) => {
      const saldo = saldoPendienteCompra(compra, pagos)

      resumen.cantidad += 1
      resumen.total += compra.total
      resumen.iva += compra.iva
      if (saldo > 0) resumen.saldoPendiente += saldo
      if (estadoContableCompra(compra, documentos) !== 'registrado') {
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

export function prefijoComprobanteCompra(tipo: string): string {
  return PREFIJOS_COMPROBANTE[tipo as TipoComprobanteCompra] ?? PREFIJOS_COMPROBANTE['Factura A']
}

/**
 * Calcula el próximo número correlativo para el tipo de comprobante elegido.
 * El sufijo conserva el formato de ocho dígitos usado por los datos demo.
 */
export function siguienteNumeroComprobanteCompra(
  compras: readonly Compra[],
  tipoComprobante: string,
): string {
  const prefijo = prefijoComprobanteCompra(tipoComprobante)
  let maximo = 0

  for (const compra of compras) {
    if (!compra.numero.startsWith(prefijo)) continue
    const sufijo = compra.numero.slice(prefijo.length)
    const numero = Number.parseInt(sufijo, 10)
    if (Number.isFinite(numero)) maximo = Math.max(maximo, numero)
  }

  return `${prefijo}${String(maximo + 1).padStart(8, '0')}`
}

export function siguienteIdCompra(compras: readonly Compra[]): string {
  const maximo = compras.reduce((max, compra) => {
    const coincidencia = /^C-(\d+)$/.exec(compra.id)
    if (!coincidencia) return max
    return Math.max(max, Number.parseInt(coincidencia[1] ?? '0', 10))
  }, 0)

  return `C-${String(maximo + 1).padStart(3, '0')}`
}

function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const siguiente = new Date(Date.UTC(anio!, mes! - 1, dia! + dias))
  return siguiente.toISOString().slice(0, 10) as FechaISO
}

/** Contado vence el mismo día; cuenta corriente, a los 30 días. */
export function calcularVencimiento(
  fecha: FechaISO,
  condicionPago: Compra['condicionPago'],
): FechaISO {
  return condicionPago === 'contado' ? fecha : sumarDias(fecha, 30)
}

/* -------------------------------------------------------------------------- */
/* Validación                                                                 */
/* -------------------------------------------------------------------------- */

export interface ErroresItemCompra {
  productoId?: string
  descripcion?: string
  cantidad?: string
  precioUnitario?: string
  alicuotaIva?: string
}

export interface ErroresCompra {
  proveedorId?: string
  fecha?: string
  vencimiento?: string
  tipoComprobante?: string
  numero?: string
  condicionPago?: string
  items?: string
  porItem: Record<number, ErroresItemCompra>
}

export interface EntradaValidacionCompra {
  proveedorId: string
  fecha: string
  vencimiento: string
  tipoComprobante: string
  numero: string
  condicionPago: string
  items: readonly ItemCompra[]
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

export function validarCompra(
  entrada: EntradaValidacionCompra,
  compras: readonly Compra[],
): ErroresCompra {
  const errores: ErroresCompra = { porItem: {} }

  if (!entrada.proveedorId) {
    errores.proveedorId = 'Seleccioná un proveedor.'
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
  } else if (compras.some((compra) => compra.numero === entrada.numero.trim())) {
    errores.numero = 'Ya existe un comprobante con ese número.'
  }
  if (!entrada.condicionPago) {
    errores.condicionPago = 'Seleccioná la condición de pago.'
  }
  if (entrada.items.length === 0) {
    errores.items = 'Agregá al menos un producto o servicio.'
  }

  entrada.items.forEach((item, indice) => {
    const erroresItem: ErroresItemCompra = {}

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

export function hayErroresCompra(errores: ErroresCompra): boolean {
  return (
    Boolean(
      errores.proveedorId ||
      errores.fecha ||
      errores.vencimiento ||
      errores.tipoComprobante ||
      errores.numero ||
      errores.condicionPago ||
      errores.items,
    ) || Object.keys(errores.porItem).length > 0
  )
}

/* -------------------------------------------------------------------------- */
/* Generación de la operación                                                 */
/* -------------------------------------------------------------------------- */

export interface DatosNuevaCompra {
  proveedor: Proveedor
  fecha: FechaISO
  vencimiento: FechaISO
  tipoComprobante: string
  numero: string
  condicionPago: Compra['condicionPago']
  items: ItemCompra[]
}

export interface CompraGenerada {
  compra: Compra
  asiento: Asiento
  documento: DocumentoContable
}

/**
 * Construye la compra, su asiento propuesto y el documento pendiente que
 * ingresará a la bandeja de Contaduría. Los importes se calculan con la misma
 * función que usa el resto del sistema para respetar el redondeo al centavo.
 */
export function generarCompra(datos: DatosNuevaCompra, id: string): CompraGenerada {
  const totales = calcularTotales(datos.items)
  const compra: Compra = {
    id,
    numero: datos.numero,
    fecha: datos.fecha,
    vencimiento: datos.vencimiento,
    proveedorId: datos.proveedor.id,
    tipoComprobante: datos.tipoComprobante,
    condicionPago: datos.condicionPago,
    items: datos.items,
    subtotal: totales.subtotal,
    iva: totales.iva,
    total: totales.total,
    estado: 'pendiente',
    documentoId: `doc-compra-${id}`,
    asientoId: `asiento-compra-${id}`,
  }

  const asiento = generarAsientoCompra(
    compra,
    `Compra ${compra.numero} - ${datos.proveedor.nombre}`,
  )

  const documento: DocumentoContable = {
    id: compra.documentoId,
    numero: compra.numero,
    tipo: 'factura_recibida',
    origen: 'compras',
    fecha: compra.fecha,
    descripcion: `Factura recibida ${compra.numero} - ${datos.proveedor.nombre}`,
    contraparte: datos.proveedor.nombre,
    importe: compra.total,
    estado: 'pendiente',
    asientoId: compra.asientoId,
    operacionId: compra.id,
  }

  return { compra, asiento, documento }
}

/* -------------------------------------------------------------------------- */
/* Cuentas por pagar                                                          */
/* -------------------------------------------------------------------------- */

export interface CuentaPorPagar {
  proveedorId: string
  proveedor: string
  cuit: string
  comprobantes: number
  vencimiento: FechaISO | null
  saldo: number
}

/**
 * Agrupa las obligaciones pendientes por proveedor. Solo considera documentos
 * ya registrados, igual que los saldos contables de terceros.
 */
export function agruparCuentasPorPagar(
  compras: readonly Compra[],
  proveedores: readonly Proveedor[],
  pagos: readonly Pago[],
  documentos: readonly DocumentoContable[],
): CuentaPorPagar[] {
  const registrados = new Set(
    documentos
      .filter((documento) => documento.estado === 'registrado')
      .map((documento) => documento.id),
  )
  const proveedoresPorId = new Map(proveedores.map((proveedor) => [proveedor.id, proveedor]))
  const agrupadas = new Map<string, CuentaPorPagar>()

  for (const compra of compras) {
    if (!registrados.has(compra.documentoId)) continue
    const saldo = saldoPendienteCompra(compra, pagos)
    if (saldo <= 0) continue

    const proveedor = proveedoresPorId.get(compra.proveedorId)
    if (!proveedor) continue

    const actual = agrupadas.get(proveedor.id)
    if (actual) {
      actual.comprobantes += 1
      actual.saldo += saldo
      if (!actual.vencimiento || compra.vencimiento < actual.vencimiento) {
        actual.vencimiento = compra.vencimiento
      }
    } else {
      agrupadas.set(proveedor.id, {
        proveedorId: proveedor.id,
        proveedor: proveedor.nombre,
        cuit: proveedor.cuit,
        comprobantes: 1,
        vencimiento: compra.vencimiento,
        saldo,
      })
    }
  }

  return [...agrupadas.values()].sort((a, b) => b.saldo - a.saldo)
}

/* -------------------------------------------------------------------------- */
/* Etiquetas de estado                                                        */
/* -------------------------------------------------------------------------- */

export function etiquetaEstadoPago(estado: EstadoPago): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente'
    case 'parcial':
      return 'Parcial'
    case 'pagada':
      return 'Pagada'
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
