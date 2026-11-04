import { generarAsientoPago } from '@/core/contabilidad/asientos'
import { CODIGOS } from '@/data/plan-cuentas'
import type { FechaISO } from '@/types'
import type {
  Asiento,
  Compra,
  DocumentoContable,
  EstadoDocumento,
  MedioPago,
  Pago,
  Proveedor,
} from '@/types/contabilidad'
import { formatearFecha } from '@/core/dinero'

export const MEDIOS_PAGO = ['banco', 'caja', 'cheque'] as const

export function cuentaIdPorMedio(medio: MedioPago): string {
  return medio === 'caja' ? CODIGOS.CAJA : CODIGOS.BANCO
}

export function etiquetaMedioPago(medio: MedioPago): string {
  switch (medio) {
    case 'banco':
      return 'Banco'
    case 'caja':
      return 'Caja'
    case 'cheque':
      return 'Cheque'
  }
}

/* -------------------------------------------------------------------------- */
/* Numeración                                                                 */
/* -------------------------------------------------------------------------- */

export function siguienteIdPago(pagos: readonly Pago[]): string {
  const maximo = pagos.reduce((max, pago) => {
    const coincidencia = /^P-(\d+)$/.exec(pago.id)
    if (!coincidencia) return max
    return Math.max(max, Number.parseInt(coincidencia[1] ?? '0', 10))
  }, 0)
  return `P-${String(maximo + 1).padStart(3, '0')}`
}

export function siguienteNumeroPago(pagos: readonly Pago[]): string {
  let maximo = 0
  for (const pago of pagos) {
    const coincidencia = /^CP-\d+-(\d+)$/.exec(pago.numero)
    if (!coincidencia) continue
    maximo = Math.max(maximo, Number.parseInt(coincidencia[1] ?? '0', 10))
  }
  return `CP-0001-${String(maximo + 1).padStart(8, '0')}`
}

export const siguienteNumeroComprobantePago = siguienteNumeroPago
export const siguienteIdComprobantePago = siguienteIdPago

/* -------------------------------------------------------------------------- */
/* Filtros y resumen                                                          */
/* -------------------------------------------------------------------------- */

export interface FiltrosPago {
  texto: string
  desde: string
  hasta: string
  medio: MedioPago | ''
  estadoContable: EstadoDocumento | ''
}

export function filtrosPagoVacios(): FiltrosPago {
  return { texto: '', desde: '', hasta: '', medio: '', estadoContable: '' }
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function estadoContablePago(
  pago: Pago,
  documentos: readonly DocumentoContable[],
): EstadoDocumento {
  return documentos.find((documento) => documento.id === pago.documentoId)?.estado ?? 'pendiente'
}

export function filtrarPagos(
  pagos: readonly Pago[],
  proveedores: readonly Proveedor[],
  compras: readonly Compra[],
  documentos: readonly DocumentoContable[],
  filtros: FiltrosPago,
): Pago[] {
  const proveedoresPorId = new Map(proveedores.map((proveedor) => [proveedor.id, proveedor]))
  const comprasPorId = new Map(compras.map((compra) => [compra.id, compra]))
  const consulta = normalizarTexto(filtros.texto)

  return pagos
    .filter((pago) => {
      const proveedor = proveedoresPorId.get(pago.proveedorId)
      const compra = comprasPorId.get(pago.compraId)
      const textoCoincide =
        !consulta ||
        [
          proveedor?.nombre ?? '',
          proveedor?.cuit ?? '',
          compra?.numero ?? '',
          pago.numero,
          pago.observaciones,
        ]
          .map(normalizarTexto)
          .some((valor) => valor.includes(consulta))

      if (!textoCoincide) return false
      if (filtros.desde && pago.fecha < filtros.desde) return false
      if (filtros.hasta && pago.fecha > filtros.hasta) return false
      if (filtros.medio && pago.medio !== filtros.medio) return false
      if (filtros.estadoContable) {
        const estado = estadoContablePago(pago, documentos)
        if (estado !== filtros.estadoContable) return false
      }
      return true
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
}

export interface ResumenPagos {
  cantidad: number
  total: number
  pendientesRegistracion: number
}

export function resumirPagos(
  pagos: readonly Pago[],
  documentos: readonly DocumentoContable[],
): ResumenPagos {
  return pagos.reduce<ResumenPagos>(
    (resumen, pago) => {
      resumen.cantidad += 1
      resumen.total += pago.importe
      if (estadoContablePago(pago, documentos) !== 'registrado') {
        resumen.pendientesRegistracion += 1
      }
      return resumen
    },
    { cantidad: 0, total: 0, pendientesRegistracion: 0 },
  )
}

/* -------------------------------------------------------------------------- */
/* Validación                                                                */
/* -------------------------------------------------------------------------- */

export interface ErroresPago {
  compraId?: string
  proveedorId?: string
  fecha?: string
  importe?: string
  medio?: string
}

export interface EntradaValidacionPago {
  compraId: string
  proveedorId: string
  fecha: string
  importe: number
  medio: string
  saldoPendiente: number
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

export function validarPago(entrada: EntradaValidacionPago, _pagos?: readonly Pago[]): ErroresPago {
  void _pagos
  const errores: ErroresPago = {}

  if (!entrada.compraId) errores.compraId = 'Seleccioná la factura a pagar.'
  if (!entrada.proveedorId) errores.proveedorId = 'Seleccioná un proveedor.'
  if (!esFechaValida(entrada.fecha)) errores.fecha = 'Ingresá una fecha válida.'
  if (!Number.isInteger(entrada.importe) || entrada.importe <= 0) {
    errores.importe = 'El importe debe ser mayor a cero.'
  } else if (entrada.importe > entrada.saldoPendiente) {
    errores.importe = 'El importe no puede superar el saldo pendiente.'
  }
  if (!entrada.medio) errores.medio = 'Seleccioná un medio de pago.'

  return errores
}

export function hayErroresPago(errores: ErroresPago): boolean {
  return Object.keys(errores).length > 0
}

/* -------------------------------------------------------------------------- */
/* Generación                                                                */
/* -------------------------------------------------------------------------- */

export interface DatosNuevoPago {
  compra: Compra
  proveedor: Proveedor
  fecha: FechaISO
  importe: number
  medio: MedioPago
  observaciones?: string
  numero?: string
}

export interface PagoGenerado {
  pago: Pago
  asiento: Asiento
  documento: DocumentoContable
}

export function generarPago(datos: DatosNuevoPago, id: string): PagoGenerado {
  const numero = datos.numero ?? siguienteNumeroPago([])
  const pago: Pago = {
    id,
    numero,
    fecha: datos.fecha,
    compraId: datos.compra.id,
    proveedorId: datos.proveedor.id,
    importe: datos.importe,
    medio: datos.medio,
    cuentaId: cuentaIdPorMedio(datos.medio),
    observaciones: datos.observaciones ?? '',
    documentoId: `doc-pago-${id}`,
    asientoId: `asiento-pago-${id}`,
  }

  const asiento = generarAsientoPago(pago, `Pago ${pago.numero} - ${datos.proveedor.nombre}`)

  const documento: DocumentoContable = {
    id: pago.documentoId,
    numero: pago.numero,
    tipo: 'comprobante_pago',
    origen: 'tesoreria',
    fecha: pago.fecha,
    descripcion: `Comprobante de pago ${pago.numero} - ${datos.proveedor.nombre}`,
    contraparte: datos.proveedor.nombre,
    importe: pago.importe,
    estado: 'pendiente',
    asientoId: pago.asientoId,
    operacionId: pago.id,
  }

  return { pago, asiento, documento }
}

export { formatearFecha }
