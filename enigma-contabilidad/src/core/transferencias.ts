import { generarAsientoTransferencia } from '@/core/contabilidad/asientos'
import { CODIGOS } from '@/data/plan-cuentas'
import type { FechaISO } from '@/types'
import type {
  Asiento,
  DocumentoContable,
  EstadoDocumento,
  Transferencia,
} from '@/types/contabilidad'

export const CUENTAS_TESORERIA = [CODIGOS.CAJA, CODIGOS.BANCO] as const

export function siguienteIdTransferencia(transferencias: readonly Transferencia[]): string {
  const maximo = transferencias.reduce((max, transferencia) => {
    const coincidencia = /^T-(\d+)$/.exec(transferencia.id)
    if (!coincidencia) return max
    return Math.max(max, Number.parseInt(coincidencia[1] ?? '0', 10))
  }, 0)
  return `T-${String(maximo + 1).padStart(3, '0')}`
}

export function siguienteNumeroTransferencia(transferencias: readonly Transferencia[]): string {
  let maximo = 0
  for (const transferencia of transferencias) {
    const coincidencia = /^TR-\d+-(\d+)$/.exec(transferencia.numero)
    if (!coincidencia) continue
    maximo = Math.max(maximo, Number.parseInt(coincidencia[1] ?? '0', 10))
  }
  return `TR-0001-${String(maximo + 1).padStart(8, '0')}`
}

export const siguienteNumeroComprobanteTransferencia = siguienteNumeroTransferencia
export const siguienteIdComprobanteTransferencia = siguienteIdTransferencia

export interface FiltrosTransferencia {
  texto: string
  desde: string
  hasta: string
  cuenta: string
  estadoContable: EstadoDocumento | ''
}

export function filtrosTransferenciaVacios(): FiltrosTransferencia {
  return { texto: '', desde: '', hasta: '', cuenta: '', estadoContable: '' }
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function estadoContableTransferencia(
  transferencia: Transferencia,
  documentos: readonly DocumentoContable[],
): EstadoDocumento {
  return (
    documentos.find((documento) => documento.id === transferencia.documentoId)?.estado ??
    'pendiente'
  )
}

export function filtrarTransferencias(
  transferencias: readonly Transferencia[],
  documentos: readonly DocumentoContable[],
  filtros: FiltrosTransferencia,
): Transferencia[] {
  const consulta = normalizarTexto(filtros.texto)
  return transferencias
    .filter((transferencia) => {
      const textoCoincide =
        !consulta ||
        [transferencia.numero, transferencia.descripcion]
          .map(normalizarTexto)
          .some((valor) => valor.includes(consulta))
      if (!textoCoincide) return false
      if (filtros.desde && transferencia.fecha < filtros.desde) return false
      if (filtros.hasta && transferencia.fecha > filtros.hasta) return false
      if (
        filtros.cuenta &&
        transferencia.cuentaOrigenId !== filtros.cuenta &&
        transferencia.cuentaDestinoId !== filtros.cuenta
      ) {
        return false
      }
      if (filtros.estadoContable) {
        const estado = estadoContableTransferencia(transferencia, documentos)
        if (estado !== filtros.estadoContable) return false
      }
      return true
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
}

export interface ResumenTransferencias {
  cantidad: number
  total: number
  pendientesRegistracion: number
}

export function resumirTransferencias(
  transferencias: readonly Transferencia[],
  documentos: readonly DocumentoContable[],
): ResumenTransferencias {
  return transferencias.reduce<ResumenTransferencias>(
    (resumen, transferencia) => {
      resumen.cantidad += 1
      resumen.total += transferencia.importe
      if (estadoContableTransferencia(transferencia, documentos) !== 'registrado') {
        resumen.pendientesRegistracion += 1
      }
      return resumen
    },
    { cantidad: 0, total: 0, pendientesRegistracion: 0 },
  )
}

export interface ErroresTransferencia {
  cuentaOrigenId?: string
  cuentaDestinoId?: string
  importe?: string
  fecha?: string
  descripcion?: string
}

export interface EntradaValidacionTransferencia {
  cuentaOrigenId: string
  cuentaDestinoId: string
  importe: number
  fecha: string
  descripcion: string
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

export function validarTransferencia(
  entrada: EntradaValidacionTransferencia,
  _transferencias?: readonly Transferencia[],
): ErroresTransferencia {
  void _transferencias
  const errores: ErroresTransferencia = {}
  if (!entrada.cuentaOrigenId) errores.cuentaOrigenId = 'Seleccioná la cuenta de origen.'
  if (!entrada.cuentaDestinoId) errores.cuentaDestinoId = 'Seleccioná la cuenta de destino.'
  if (entrada.cuentaOrigenId && entrada.cuentaOrigenId === entrada.cuentaDestinoId) {
    errores.cuentaDestinoId = 'La cuenta de destino debe ser distinta a la de origen.'
  }
  if (!esFechaValida(entrada.fecha)) errores.fecha = 'Ingresá una fecha válida.'
  if (!Number.isInteger(entrada.importe) || entrada.importe <= 0) {
    errores.importe = 'El importe debe ser mayor a cero.'
  }
  if (!entrada.descripcion.trim()) errores.descripcion = 'Ingresá una descripción.'
  return errores
}

export function hayErroresTransferencia(errores: ErroresTransferencia): boolean {
  return Object.keys(errores).length > 0
}

export interface DatosNuevaTransferencia {
  fecha: FechaISO
  cuentaOrigenId: string
  cuentaDestinoId: string
  importe: number
  descripcion: string
  numero?: string
}

export interface TransferenciaGenerada {
  transferencia: Transferencia
  asiento: Asiento
  documento: DocumentoContable
}

export function generarTransferencia(
  datos: DatosNuevaTransferencia,
  id: string,
): TransferenciaGenerada {
  const numero = datos.numero ?? siguienteNumeroTransferencia([])
  const transferencia: Transferencia = {
    id,
    numero,
    fecha: datos.fecha,
    cuentaOrigenId: datos.cuentaOrigenId,
    cuentaDestinoId: datos.cuentaDestinoId,
    importe: datos.importe,
    descripcion: datos.descripcion,
    documentoId: `doc-transferencia-${id}`,
    asientoId: `asiento-transferencia-${id}`,
  }

  const asiento = generarAsientoTransferencia(transferencia, datos.descripcion)

  const documento: DocumentoContable = {
    id: transferencia.documentoId,
    numero: transferencia.numero,
    tipo: 'transferencia',
    origen: 'tesoreria',
    fecha: transferencia.fecha,
    descripcion: `Transferencia interna ${transferencia.numero}`,
    contraparte: null,
    importe: transferencia.importe,
    estado: 'pendiente',
    asientoId: transferencia.asientoId,
    operacionId: transferencia.id,
  }

  return { transferencia, asiento, documento }
}
