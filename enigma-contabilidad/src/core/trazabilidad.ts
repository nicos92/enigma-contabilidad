import type { FechaISO } from '@/types'
import type {
  Asiento,
  Compra,
  DocumentoContable,
  EstadoContable,
  EstadoDocumento,
  Venta,
} from '@/types/contabilidad'
import type { EstadoPaso } from '@/components/ui/tipos'
import {
  estadoCobroVenta,
  estadoPagoCompra,
  saldoPendienteCompra,
  saldoPendienteVenta,
} from '@/core/contabilidad'
import { formatearFecha, formatearMoneda } from '@/core/dinero'
import { etiquetaEstadoDocumento } from '@/core/contaduria'

export type TipoOperacionTrazabilidad = 'compra' | 'venta'

export type ClaveEtapaTrazabilidad =
  | 'origen'
  | 'documento'
  | 'contaduria'
  | 'autorizacion'
  | 'asiento'
  | 'diario'
  | 'mayor'
  | 'tesoreria'
  | 'balance'

export interface DestinoTrazabilidad {
  path: string
  query?: Record<string, string>
}

export interface EtapaTrazabilidad {
  clave: ClaveEtapaTrazabilidad
  titulo: string
  departamento: string
  descripcion: string
  estado: EstadoPaso
  fecha: FechaISO | null
  referencia: string | null
  importe: number | null
  destino: DestinoTrazabilidad
}

export type EstadoRecorridoTrazabilidad = 'completada' | 'en_curso' | 'observada'

export interface ResumenTrazabilidad {
  completadas: number
  total: number
  porcentaje: number
  estado: EstadoRecorridoTrazabilidad
}

export interface TrazabilidadOperacion {
  tipo: TipoOperacionTrazabilidad
  id: string
  numero: string
  fecha: FechaISO
  contraparte: string
  importe: number
  estadoComercial: string
  estadoComercialClave: 'pendiente' | 'parcial' | 'pagada' | 'cobrada'
  estadoContable: EstadoDocumento
  documento: DocumentoContable
  asiento: Asiento | null
  comprobantesTesoreria: number
  saldoPendiente: number
  cuentaPrincipal: string | null
  etapas: EtapaTrazabilidad[]
  resumen: ResumenTrazabilidad
}

export interface OperacionTrazable {
  tipo: TipoOperacionTrazabilidad
  id: string
  numero: string
  fecha: FechaISO
  contraparte: string
  importe: number
  estadoComercial: string
  estadoContable: EstadoDocumento
}

function etiquetaEstadoComercial(estado: 'pendiente' | 'parcial' | 'pagada' | 'cobrada'): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente'
    case 'parcial':
      return 'Parcial'
    case 'pagada':
      return 'Pagada'
    case 'cobrada':
      return 'Cobrada'
  }
}

function cuentaPrincipalDeAsiento(asiento: Asiento | null | undefined): string | null {
  if (!asiento) return null
  const linea = asiento.lineas.find((actual) => actual.debe > 0 || actual.haber > 0)
  return linea?.cuentaId ?? null
}

function referenciaCuenta(estado: EstadoContable, codigo: string | null): string | null {
  if (!codigo) return null
  const cuenta = estado.cuentas.find((actual) => actual.codigo === codigo)
  return cuenta ? `${cuenta.codigo} - ${cuenta.nombre}` : codigo
}

function nombreCuenta(estado: EstadoContable, codigo: string | null): string | null {
  if (!codigo) return null
  return estado.cuentas.find((actual) => actual.codigo === codigo)?.nombre ?? codigo
}

function estadoAutorizacion(documento: DocumentoContable, asiento: Asiento | null): EstadoPaso {
  if (documento.estado === 'registrado' && asiento?.estado === 'registrado') return 'completado'
  if (documento.estado === 'observado') return 'observado'
  return 'actual'
}

function crearResumen(etapas: readonly EtapaTrazabilidad[]): ResumenTrazabilidad {
  const total = etapas.length
  const completadas = etapas.filter((etapa) => etapa.estado === 'completado').length
  const observada = etapas.some((etapa) => etapa.estado === 'observado')
  const estado: EstadoRecorridoTrazabilidad = observada
    ? 'observada'
    : completadas === total
      ? 'completada'
      : 'en_curso'

  return {
    completadas,
    total,
    porcentaje: total > 0 ? Math.round((completadas / total) * 100) : 0,
    estado,
  }
}

function etapasDocumentoYContabilidad(
  estado: EstadoContable,
  documento: DocumentoContable,
  asiento: Asiento | null,
  cuentaPrincipal: string | null,
  destinoDocumento: DestinoTrazabilidad,
  destinoAsiento: DestinoTrazabilidad,
): EtapaTrazabilidad[] {
  const registrado = documento.estado === 'registrado' && asiento?.estado === 'registrado'
  const fechaRegistro = asiento?.fechaRegistro ?? null
  const numeroAsiento = asiento?.numero ?? null
  const nombreCuentaPrincipal = nombreCuenta(estado, cuentaPrincipal)
  const destinoMayor: DestinoTrazabilidad = cuentaPrincipal
    ? {
        path: '/libros',
        query: {
          vista: 'mayor',
          cuenta: cuentaPrincipal,
          ...(asiento ? { asiento: asiento.id } : {}),
        },
      }
    : { path: '/libros', query: { vista: 'mayor' } }
  const destinoBalance: DestinoTrazabilidad = cuentaPrincipal
    ? { path: '/balances', query: { vista: 'comprobacion', cuenta: cuentaPrincipal } }
    : { path: '/balances', query: { vista: 'comprobacion' } }

  return [
    {
      clave: 'contaduria',
      titulo: 'Recepción en Contaduría',
      departamento: 'Contaduría',
      descripcion: `El documento ${documento.numero} ingresó a la bandeja de revisión documental.`,
      estado: 'completado',
      fecha: documento.fecha,
      referencia: `Estado: ${etiquetaEstadoDocumento(documento.estado)}`,
      importe: documento.importe,
      destino: destinoDocumento,
    },
    {
      clave: 'autorizacion',
      titulo: 'Autorización y registración',
      departamento: 'Contaduría',
      descripcion: registrado
        ? 'El documento fue aprobado y el asiento quedó registrado en la contabilidad.'
        : documento.estado === 'observado'
          ? `El documento fue observado${documento.motivoObservacion ? `: ${documento.motivoObservacion}` : '.'}`
          : `El documento está ${etiquetaEstadoDocumento(documento.estado).toLocaleLowerCase('es')} y espera la aprobación contable.`,
      estado: estadoAutorizacion(documento, asiento),
      fecha: registrado ? fechaRegistro : documento.fecha,
      referencia: registrado
        ? numeroAsiento
          ? `Asiento N.º ${numeroAsiento}`
          : 'Asiento registrado'
        : etiquetaEstadoDocumento(documento.estado),
      importe: documento.importe,
      destino: destinoDocumento,
    },
    {
      clave: 'asiento',
      titulo: 'Asiento contable',
      departamento: 'Contabilidad',
      descripcion: asiento
        ? registrado
          ? `Asiento N.º ${numeroAsiento ?? '—'} con ${asiento.lineas.length} líneas y partida doble verificada.`
          : 'El asiento está propuesto y se registrará al aprobar el documento.'
        : 'La operación todavía no tiene un asiento contable asociado.',
      estado: registrado ? 'completado' : asiento ? 'pendiente' : 'pendiente',
      fecha: asiento?.fechaRegistro ?? null,
      referencia: asiento
        ? numeroAsiento
          ? `Asiento N.º ${numeroAsiento}`
          : 'Asiento propuesto'
        : null,
      importe: asiento ? asiento.lineas.reduce((total, linea) => total + linea.debe, 0) : null,
      destino: destinoAsiento,
    },
    {
      clave: 'diario',
      titulo: 'Libro Diario',
      departamento: 'Libros contables',
      descripcion: registrado
        ? `El asiento N.º ${numeroAsiento ?? '—'} integra el Libro Diario del período.`
        : 'El asiento se incorporará al Libro Diario cuando se registre.',
      estado: registrado ? 'completado' : 'pendiente',
      fecha: fechaRegistro,
      referencia: numeroAsiento ? `Asiento N.º ${numeroAsiento}` : null,
      importe: null,
      destino: {
        path: '/libros',
        query: { vista: 'diario', ...(asiento ? { asiento: asiento.id } : {}) },
      },
    },
    {
      clave: 'mayor',
      titulo: 'Libro Mayor',
      departamento: 'Libros contables',
      descripcion: registrado
        ? `La cuenta ${nombreCuentaPrincipal ?? 'principal'} refleja el movimiento del asiento N.º ${numeroAsiento ?? '—'}.`
        : 'El Mayor se actualizará cuando el asiento quede registrado.',
      estado: registrado ? 'completado' : 'pendiente',
      fecha: fechaRegistro,
      referencia: referenciaCuenta(estado, cuentaPrincipal),
      importe: null,
      destino: destinoMayor,
    },
    {
      clave: 'balance',
      titulo: 'Balance de comprobación',
      departamento: 'Estados contables',
      descripcion: registrado
        ? 'El asiento ya está incluido en el Balance de Comprobación y en los estados contables.'
        : 'El Balance se actualizará cuando el asiento quede registrado.',
      estado: registrado ? 'completado' : 'pendiente',
      fecha: fechaRegistro,
      referencia: referenciaCuenta(estado, cuentaPrincipal),
      importe: null,
      destino: destinoBalance,
    },
  ]
}

function etapasCompra(estado: EstadoContable, compra: Compra): TrazabilidadOperacion | null {
  const documento = estado.documentos.find((actual) => actual.id === compra.documentoId)
  if (!documento) return null

  const asiento = estado.asientos.find((actual) => actual.id === compra.asientoId) ?? null
  const proveedor = estado.proveedores.find((actual) => actual.id === compra.proveedorId)
  const pagos = estado.pagos
    .filter((actual) => actual.compraId === compra.id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id))
  const totalAplicado = pagos.reduce((total, pago) => total + pago.importe, 0)
  const saldo = saldoPendienteCompra(compra, estado.pagos)
  const estadoComercialClave = estadoPagoCompra(compra, estado.pagos)
  const ultimoPago = pagos[pagos.length - 1] ?? null
  const cuentaPrincipal = cuentaPrincipalDeAsiento(asiento)
  const destinoDocumento: DestinoTrazabilidad = {
    path: '/compras',
    query: { operacion: compra.id, tab: 'factura' },
  }
  const destinoAsiento: DestinoTrazabilidad = asiento
    ? { path: '/contaduria', query: { vista: 'asientos', asiento: asiento.id } }
    : { path: '/contaduria', query: { vista: 'asientos' } }
  const destinoTesoreria: DestinoTrazabilidad = ultimoPago
    ? { path: '/tesoreria', query: { vista: 'pagos', pago: ultimoPago.id } }
    : { path: '/tesoreria', query: { vista: 'pagos' } }

  const etapas: EtapaTrazabilidad[] = [
    {
      clave: 'origen',
      titulo: 'Origen en Compras',
      departamento: 'Compras',
      descripcion: `La operación ${compra.numero} se registró con ${proveedor?.nombre ?? 'el proveedor'}.`,
      estado: 'completado',
      fecha: compra.fecha,
      referencia: compra.numero,
      importe: compra.total,
      destino: { path: '/compras', query: { operacion: compra.id } },
    },
    {
      clave: 'documento',
      titulo: 'Factura recibida',
      departamento: 'Documentación comercial',
      descripcion: `Se generó la factura recibida ${documento.numero} con su detalle de ítems e impuestos.`,
      estado: 'completado',
      fecha: documento.fecha,
      referencia: documento.numero,
      importe: documento.importe,
      destino: destinoDocumento,
    },
    {
      clave: 'tesoreria',
      titulo: 'Pago al proveedor',
      departamento: 'Tesorería',
      descripcion:
        totalAplicado <= 0
          ? `Sin pagos aplicados. Saldo pendiente: ${formatearMoneda(saldo)}; vence el ${formatearFecha(compra.vencimiento)}.`
          : saldo <= 0
            ? `Obligación cancelada. Total pagado: ${formatearMoneda(totalAplicado)}.`
            : `Pago parcial registrado. Aplicado: ${formatearMoneda(totalAplicado)}; saldo: ${formatearMoneda(saldo)}.`,
      estado: totalAplicado <= 0 ? 'pendiente' : saldo <= 0 ? 'completado' : 'actual',
      fecha: ultimoPago?.fecha ?? null,
      referencia:
        pagos.length > 0
          ? `${pagos.length} comprobante${pagos.length === 1 ? '' : 's'} de pago`
          : `Vence ${formatearFecha(compra.vencimiento)}`,
      importe: totalAplicado,
      destino: destinoTesoreria,
    },
    ...etapasDocumentoYContabilidad(
      estado,
      documento,
      asiento,
      cuentaPrincipal,
      destinoDocumento,
      destinoAsiento,
    ),
  ]

  return {
    tipo: 'compra',
    id: compra.id,
    numero: compra.numero,
    fecha: compra.fecha,
    contraparte: proveedor?.nombre ?? 'Proveedor',
    importe: compra.total,
    estadoComercial: etiquetaEstadoComercial(estadoComercialClave),
    estadoComercialClave,
    estadoContable: documento.estado,
    documento,
    asiento,
    comprobantesTesoreria: pagos.length,
    saldoPendiente: saldo,
    cuentaPrincipal,
    etapas,
    resumen: crearResumen(etapas),
  }
}

function etapasVenta(estado: EstadoContable, venta: Venta): TrazabilidadOperacion | null {
  const documento = estado.documentos.find((actual) => actual.id === venta.documentoId)
  if (!documento) return null

  const asiento = estado.asientos.find((actual) => actual.id === venta.asientoId) ?? null
  const cliente = estado.clientes.find((actual) => actual.id === venta.clienteId)
  const cobros = estado.cobros
    .filter((actual) => actual.ventaId === venta.id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id))
  const totalAplicado = cobros.reduce((total, cobro) => total + cobro.importe, 0)
  const saldo = saldoPendienteVenta(venta, estado.cobros)
  const estadoComercialClave = estadoCobroVenta(venta, estado.cobros)
  const ultimoCobro = cobros[cobros.length - 1] ?? null
  const cuentaPrincipal = cuentaPrincipalDeAsiento(asiento)
  const destinoDocumento: DestinoTrazabilidad = {
    path: '/ventas',
    query: { operacion: venta.id, tab: 'factura' },
  }
  const destinoAsiento: DestinoTrazabilidad = asiento
    ? { path: '/contaduria', query: { vista: 'asientos', asiento: asiento.id } }
    : { path: '/contaduria', query: { vista: 'asientos' } }
  const destinoTesoreria: DestinoTrazabilidad = ultimoCobro
    ? { path: '/tesoreria', query: { vista: 'cobros', cobro: ultimoCobro.id } }
    : { path: '/tesoreria', query: { vista: 'cobros' } }

  const etapas: EtapaTrazabilidad[] = [
    {
      clave: 'origen',
      titulo: 'Origen en Ventas',
      departamento: 'Ventas',
      descripcion: `La operación ${venta.numero} se registró con ${cliente?.nombre ?? 'el cliente'}.`,
      estado: 'completado',
      fecha: venta.fecha,
      referencia: venta.numero,
      importe: venta.total,
      destino: { path: '/ventas', query: { operacion: venta.id } },
    },
    {
      clave: 'documento',
      titulo: 'Factura emitida',
      departamento: 'Documentación comercial',
      descripcion: `Se generó la factura emitida ${documento.numero} con su detalle de ítems e impuestos.`,
      estado: 'completado',
      fecha: documento.fecha,
      referencia: documento.numero,
      importe: documento.importe,
      destino: destinoDocumento,
    },
    {
      clave: 'tesoreria',
      titulo: 'Cobro al cliente',
      departamento: 'Tesorería',
      descripcion:
        totalAplicado <= 0
          ? `Sin cobros aplicados. Saldo pendiente: ${formatearMoneda(saldo)}; vence el ${formatearFecha(venta.vencimiento)}.`
          : saldo <= 0
            ? `Obligación cancelada. Total cobrado: ${formatearMoneda(totalAplicado)}.`
            : `Cobro parcial registrado. Aplicado: ${formatearMoneda(totalAplicado)}; saldo: ${formatearMoneda(saldo)}.`,
      estado: totalAplicado <= 0 ? 'pendiente' : saldo <= 0 ? 'completado' : 'actual',
      fecha: ultimoCobro?.fecha ?? null,
      referencia:
        cobros.length > 0
          ? `${cobros.length} recibo${cobros.length === 1 ? '' : 's'} de cobro`
          : `Vence ${formatearFecha(venta.vencimiento)}`,
      importe: totalAplicado,
      destino: destinoTesoreria,
    },
    ...etapasDocumentoYContabilidad(
      estado,
      documento,
      asiento,
      cuentaPrincipal,
      destinoDocumento,
      destinoAsiento,
    ),
  ]

  return {
    tipo: 'venta',
    id: venta.id,
    numero: venta.numero,
    fecha: venta.fecha,
    contraparte: cliente?.nombre ?? 'Cliente',
    importe: venta.total,
    estadoComercial: etiquetaEstadoComercial(estadoComercialClave),
    estadoComercialClave,
    estadoContable: documento.estado,
    documento,
    asiento,
    comprobantesTesoreria: cobros.length,
    saldoPendiente: saldo,
    cuentaPrincipal,
    etapas,
    resumen: crearResumen(etapas),
  }
}

/** Construye el recorrido completo de una compra o venta. */
export function construirTrazabilidad(
  estado: EstadoContable,
  tipo: TipoOperacionTrazabilidad,
  operacionId: string,
): TrazabilidadOperacion | null {
  if (tipo === 'compra') {
    const compra = estado.compras.find((actual) => actual.id === operacionId)
    return compra ? etapasCompra(estado, compra) : null
  }

  const venta = estado.ventas.find((actual) => actual.id === operacionId)
  return venta ? etapasVenta(estado, venta) : null
}

/** Devuelve las operaciones que se pueden seleccionar en la pantalla de trazabilidad. */
export function listarOperacionesTrazables(
  estado: EstadoContable,
  tipo: TipoOperacionTrazabilidad,
): OperacionTrazable[] {
  if (tipo === 'compra') {
    return estado.compras
      .map((compra): OperacionTrazable | null => {
        const documento = estado.documentos.find((actual) => actual.id === compra.documentoId)
        if (!documento) return null
        const proveedor = estado.proveedores.find((actual) => actual.id === compra.proveedorId)
        const estadoComercialClave = estadoPagoCompra(compra, estado.pagos)
        return {
          tipo: 'compra',
          id: compra.id,
          numero: compra.numero,
          fecha: compra.fecha,
          contraparte: proveedor?.nombre ?? 'Proveedor',
          importe: compra.total,
          estadoComercial: etiquetaEstadoComercial(estadoComercialClave),
          estadoContable: documento.estado,
        }
      })
      .filter((operacion): operacion is OperacionTrazable => operacion !== null)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
  }

  return estado.ventas
    .map((venta): OperacionTrazable | null => {
      const documento = estado.documentos.find((actual) => actual.id === venta.documentoId)
      if (!documento) return null
      const cliente = estado.clientes.find((actual) => actual.id === venta.clienteId)
      const estadoComercialClave = estadoCobroVenta(venta, estado.cobros)
      return {
        tipo: 'venta',
        id: venta.id,
        numero: venta.numero,
        fecha: venta.fecha,
        contraparte: cliente?.nombre ?? 'Cliente',
        importe: venta.total,
        estadoComercial: etiquetaEstadoComercial(estadoComercialClave),
        estadoContable: documento.estado,
      }
    })
    .filter((operacion): operacion is OperacionTrazable => operacion !== null)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
}

/** Primera cuenta imputada del asiento, usada para enlazar Mayor y Balance. */
export function cuentaPrincipalDeOperacion(
  estado: EstadoContable,
  tipo: TipoOperacionTrazabilidad,
  operacionId: string,
): string | null {
  const operacion = construirTrazabilidad(estado, tipo, operacionId)
  return operacion?.cuentaPrincipal ?? null
}
