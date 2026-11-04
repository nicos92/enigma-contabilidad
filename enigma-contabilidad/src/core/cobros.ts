import { generarAsientoCobro } from '@/core/contabilidad/asientos'
import { CODIGOS } from '@/data/plan-cuentas'
import type { FechaISO } from '@/types'
import type {
  Asiento,
  Cliente,
  Cobro,
  DocumentoContable,
  EstadoDocumento,
  MedioPago,
  Venta,
} from '@/types/contabilidad'

export const MEDIOS_COBRO = ['banco', 'caja', 'cheque'] as const

export function cuentaIdPorMedio(medio: MedioPago): string {
  return medio === 'caja' ? CODIGOS.CAJA : CODIGOS.BANCO
}

export function etiquetaMedioCobro(medio: MedioPago): string {
  switch (medio) {
    case 'banco':
      return 'Banco'
    case 'caja':
      return 'Caja'
    case 'cheque':
      return 'Cheque'
  }
}

export function siguienteIdCobro(cobros: readonly Cobro[]): string {
  const maximo = cobros.reduce((max, cobro) => {
    const coincidencia = /^K-(\d+)$/.exec(cobro.id)
    if (!coincidencia) return max
    return Math.max(max, Number.parseInt(coincidencia[1] ?? '0', 10))
  }, 0)
  return `K-${String(maximo + 1).padStart(3, '0')}`
}

export function siguienteNumeroCobro(cobros: readonly Cobro[]): string {
  let maximo = 0
  for (const cobro of cobros) {
    const coincidencia = /^RC-\d+-(\d+)$/.exec(cobro.numero)
    if (!coincidencia) continue
    maximo = Math.max(maximo, Number.parseInt(coincidencia[1] ?? '0', 10))
  }
  return `RC-0001-${String(maximo + 1).padStart(8, '0')}`
}

export const siguienteNumeroComprobanteCobro = siguienteNumeroCobro
export const siguienteIdComprobanteCobro = siguienteIdCobro
export const siguienteNumeroRecibo = siguienteNumeroCobro

export interface FiltrosCobro {
  texto: string
  desde: string
  hasta: string
  medio: MedioPago | ''
  estadoContable: EstadoDocumento | ''
}

export function filtrosCobroVacios(): FiltrosCobro {
  return { texto: '', desde: '', hasta: '', medio: '', estadoContable: '' }
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function estadoContableCobro(
  cobro: Cobro,
  documentos: readonly DocumentoContable[],
): EstadoDocumento {
  return documentos.find((documento) => documento.id === cobro.documentoId)?.estado ?? 'pendiente'
}

export function filtrarCobros(
  cobros: readonly Cobro[],
  clientes: readonly Cliente[],
  ventas: readonly Venta[],
  documentos: readonly DocumentoContable[],
  filtros: FiltrosCobro,
): Cobro[] {
  const clientesPorId = new Map(clientes.map((cliente) => [cliente.id, cliente]))
  const ventasPorId = new Map(ventas.map((venta) => [venta.id, venta]))
  const consulta = normalizarTexto(filtros.texto)

  return cobros
    .filter((cobro) => {
      const cliente = clientesPorId.get(cobro.clienteId)
      const venta = ventasPorId.get(cobro.ventaId)
      const textoCoincide =
        !consulta ||
        [
          cliente?.nombre ?? '',
          cliente?.cuit ?? '',
          venta?.numero ?? '',
          cobro.numero,
          cobro.observaciones,
        ]
          .map(normalizarTexto)
          .some((valor) => valor.includes(consulta))

      if (!textoCoincide) return false
      if (filtros.desde && cobro.fecha < filtros.desde) return false
      if (filtros.hasta && cobro.fecha > filtros.hasta) return false
      if (filtros.medio && cobro.medio !== filtros.medio) return false
      if (filtros.estadoContable) {
        const estado = estadoContableCobro(cobro, documentos)
        if (estado !== filtros.estadoContable) return false
      }
      return true
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
}

export interface ResumenCobros {
  cantidad: number
  total: number
  pendientesRegistracion: number
}

export function resumirCobros(
  cobros: readonly Cobro[],
  documentos: readonly DocumentoContable[],
): ResumenCobros {
  return cobros.reduce<ResumenCobros>(
    (resumen, cobro) => {
      resumen.cantidad += 1
      resumen.total += cobro.importe
      if (estadoContableCobro(cobro, documentos) !== 'registrado') {
        resumen.pendientesRegistracion += 1
      }
      return resumen
    },
    { cantidad: 0, total: 0, pendientesRegistracion: 0 },
  )
}

export interface ErroresCobro {
  ventaId?: string
  clienteId?: string
  fecha?: string
  importe?: string
  medio?: string
}

export interface EntradaValidacionCobro {
  ventaId: string
  clienteId: string
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

export function validarCobro(
  entrada: EntradaValidacionCobro,
  _cobros?: readonly Cobro[],
): ErroresCobro {
  void _cobros
  const errores: ErroresCobro = {}

  if (!entrada.ventaId) errores.ventaId = 'Seleccioná la factura a cobrar.'
  if (!entrada.clienteId) errores.clienteId = 'Seleccioná un cliente.'
  if (!esFechaValida(entrada.fecha)) errores.fecha = 'Ingresá una fecha válida.'
  if (!Number.isInteger(entrada.importe) || entrada.importe <= 0) {
    errores.importe = 'El importe debe ser mayor a cero.'
  } else if (entrada.importe > entrada.saldoPendiente) {
    errores.importe = 'El importe no puede superar el saldo pendiente.'
  }
  if (!entrada.medio) errores.medio = 'Seleccioná un medio de cobro.'

  return errores
}

export function hayErroresCobro(errores: ErroresCobro): boolean {
  return Object.keys(errores).length > 0
}

export interface DatosNuevoCobro {
  venta: Venta
  cliente: Cliente
  fecha: FechaISO
  importe: number
  medio: MedioPago
  observaciones?: string
  numero?: string
}

export interface CobroGenerado {
  cobro: Cobro
  asiento: Asiento
  documento: DocumentoContable
}

export function generarCobro(datos: DatosNuevoCobro, id: string): CobroGenerado {
  const numero = datos.numero ?? siguienteNumeroCobro([])
  const cobro: Cobro = {
    id,
    numero,
    fecha: datos.fecha,
    ventaId: datos.venta.id,
    clienteId: datos.cliente.id,
    importe: datos.importe,
    medio: datos.medio,
    cuentaId: cuentaIdPorMedio(datos.medio),
    observaciones: datos.observaciones ?? '',
    documentoId: `doc-cobro-${id}`,
    asientoId: `asiento-cobro-${id}`,
  }

  const asiento = generarAsientoCobro(cobro, `Cobro ${cobro.numero} - ${datos.cliente.nombre}`)

  const documento: DocumentoContable = {
    id: cobro.documentoId,
    numero: cobro.numero,
    tipo: 'recibo',
    origen: 'tesoreria',
    fecha: cobro.fecha,
    descripcion: `Recibo de cobro ${cobro.numero} - ${datos.cliente.nombre}`,
    contraparte: datos.cliente.nombre,
    importe: cobro.importe,
    estado: 'pendiente',
    asientoId: cobro.asientoId,
    operacionId: cobro.id,
  }

  return { cobro, asiento, documento }
}