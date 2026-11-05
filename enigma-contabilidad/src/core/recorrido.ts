import type { EstadoContable } from '@/types/contabilidad'
import type {
  ClaveEtapaTrazabilidad,
  DestinoTrazabilidad,
  TrazabilidadOperacion,
  TipoOperacionTrazabilidad,
} from '@/core/trazabilidad'
import { construirTrazabilidad, listarOperacionesTrazables } from '@/core/trazabilidad'

export type ClavePasoRecorrido =
  | 'dashboard'
  | 'registrar-compra'
  | 'factura-recibida'
  | 'pago-proveedor'
  | 'contaduria'
  | 'revisar-documentacion'
  | 'aprobar-asiento'
  | 'libro-diario'
  | 'libro-mayor'
  | 'balance-comprobacion'
  | 'registrar-venta'
  | 'cobro-cliente'
  | 'comprobar-contabilidad'

export interface PasoRecorridoGuiado {
  clave: ClavePasoRecorrido
  numero: number
  titulo: string
  descripcion: string
  departamento: string
  destino: DestinoTrazabilidad
  tipoOperacion: TipoOperacionTrazabilidad | 'general'
  operacionId: string | null
}

export interface OpcionesRecorrido {
  compraId?: string | null
  ventaId?: string | null
}

const DESTINO_DASHBOARD: DestinoTrazabilidad = { path: '/dashboard' }
const DESTINO_NUEVA_COMPRA: DestinoTrazabilidad = { path: '/compras', query: { vista: 'nueva' } }
const DESTINO_NUEVA_VENTA: DestinoTrazabilidad = { path: '/ventas', query: { vista: 'nueva' } }
const DESTINO_BANDEJA: DestinoTrazabilidad = { path: '/contaduria', query: { vista: 'bandeja' } }
const DESTINO_ASIENTOS: DestinoTrazabilidad = { path: '/contaduria', query: { vista: 'asientos' } }
const DESTINO_DIARIO: DestinoTrazabilidad = { path: '/libros', query: { vista: 'diario' } }
const DESTINO_MAYOR: DestinoTrazabilidad = { path: '/libros', query: { vista: 'mayor' } }
const DESTINO_BALANCE: DestinoTrazabilidad = {
  path: '/balances',
  query: { vista: 'comprobacion' },
}

function operacionPorDefecto(
  estado: EstadoContable,
  tipo: TipoOperacionTrazabilidad,
  idPreferido?: string | null,
): TrazabilidadOperacion | null {
  if (idPreferido) {
    const solicitada = construirTrazabilidad(estado, tipo, idPreferido)
    if (solicitada) return solicitada
  }

  const predeterminada = tipo === 'compra' ? 'C-001' : 'V-001'
  const porId = construirTrazabilidad(estado, tipo, predeterminada)
  if (porId) return porId

  const operaciones = listarOperacionesTrazables(estado, tipo)
  const primera = operaciones[0]
  return primera ? construirTrazabilidad(estado, tipo, primera.id) : null
}

function destinoEtapa(
  operacion: TrazabilidadOperacion | null,
  clave: ClaveEtapaTrazabilidad,
  respaldo: DestinoTrazabilidad,
): DestinoTrazabilidad {
  const etapa = operacion?.etapas.find((actual) => actual.clave === clave)
  return etapa?.destino ?? respaldo
}

function destinoDocumento(
  operacion: TrazabilidadOperacion | null,
  respaldo: DestinoTrazabilidad,
): DestinoTrazabilidad {
  if (!operacion) return respaldo
  return {
    path: operacion.tipo === 'compra' ? '/compras' : '/ventas',
    query: { operacion: operacion.id, tab: 'factura' },
  }
}

function destinoAsiento(
  operacion: TrazabilidadOperacion | null,
  respaldo: DestinoTrazabilidad,
): DestinoTrazabilidad {
  if (!operacion?.asiento) return respaldo
  return {
    path: '/contaduria',
    query: { vista: 'asientos', asiento: operacion.asiento.id },
  }
}

function destinoRevisionDocumento(operacion: TrazabilidadOperacion | null): DestinoTrazabilidad {
  if (!operacion) return DESTINO_BANDEJA
  return {
    path: '/contaduria',
    query: { vista: 'bandeja', documento: operacion.documento.id },
  }
}

/**
 * Arma el recorrido de aceptación de 13 pasos, enlazando una compra y una venta
 * concretas para que la presentación no dependa de buscar pantallas a mano.
 */
export function construirRecorrido(
  estado: EstadoContable,
  opciones: OpcionesRecorrido = {},
): PasoRecorridoGuiado[] {
  const compra = operacionPorDefecto(estado, 'compra', opciones.compraId)
  const venta = operacionPorDefecto(estado, 'venta', opciones.ventaId)

  return [
    {
      clave: 'dashboard',
      numero: 1,
      titulo: 'Ingresar al Dashboard',
      descripcion:
        'El panel general resume ventas, compras, cobros, pagos y el resultado del período.',
      departamento: 'General',
      destino: DESTINO_DASHBOARD,
      tipoOperacion: 'general',
      operacionId: null,
    },
    {
      clave: 'registrar-compra',
      numero: 2,
      titulo: 'Registrar una compra',
      descripcion:
        'Alta de la operación comercial con proveedor, ítems, impuestos y condición de pago.',
      departamento: 'Compras',
      destino: DESTINO_NUEVA_COMPRA,
      tipoOperacion: 'compra',
      operacionId: compra?.id ?? null,
    },
    {
      clave: 'factura-recibida',
      numero: 3,
      titulo: 'Visualizar la factura recibida',
      descripcion: compra
        ? `Comprobante ${compra.documento.numero} de ${compra.contraparte}, con su asiento propuesto.`
        : 'Comprobante recibido con su detalle de ítems e impuestos.',
      departamento: 'Documentación comercial',
      destino: destinoDocumento(compra, { path: '/compras', query: { tab: 'factura' } }),
      tipoOperacion: 'compra',
      operacionId: compra?.id ?? null,
    },
    {
      clave: 'pago-proveedor',
      numero: 4,
      titulo: 'Registrar el pago al proveedor',
      descripcion:
        compra && compra.comprobantesTesoreria > 0
          ? `Pago registrado por ${compra.etapas.find((etapa) => etapa.clave === 'tesoreria')?.referencia ?? 'el comprobante'}.`
          : 'Tesorería aplica el pago contra la obligación y actualiza caja o banco.',
      departamento: 'Tesorería',
      destino: destinoEtapa(compra, 'tesoreria', {
        path: '/tesoreria',
        query: { vista: 'pagos' },
      }),
      tipoOperacion: 'compra',
      operacionId: compra?.id ?? null,
    },
    {
      clave: 'contaduria',
      numero: 5,
      titulo: 'Ingresar a Contaduría',
      descripcion: 'La bandeja concentra los documentos pendientes de revisión y registración.',
      departamento: 'Contaduría',
      destino: DESTINO_BANDEJA,
      tipoOperacion: 'general',
      operacionId: compra?.id ?? null,
    },
    {
      clave: 'revisar-documentacion',
      numero: 6,
      titulo: 'Revisar la documentación',
      descripcion: compra
        ? `Verificación del comprobante ${compra.documento.numero}, sus importes y la partida doble.`
        : 'Revisión del comprobante y de la propuesta de asiento.',
      departamento: 'Contaduría',
      destino: destinoRevisionDocumento(compra),
      tipoOperacion: 'compra',
      operacionId: compra?.id ?? null,
    },
    {
      clave: 'aprobar-asiento',
      numero: 7,
      titulo: 'Aprobar y generar el asiento',
      descripcion: compra?.asiento
        ? `Asiento N.º ${compra.asiento.numero ?? '—'}; al aprobarlo se registra en la contabilidad.`
        : 'Aprobación del documento y registración del asiento contable.',
      departamento: 'Contaduría',
      destino: destinoAsiento(compra, DESTINO_ASIENTOS),
      tipoOperacion: 'compra',
      operacionId: compra?.id ?? null,
    },
    {
      clave: 'libro-diario',
      numero: 8,
      titulo: 'Consultar el Libro Diario',
      descripcion:
        'El asiento registrado se ordena cronológicamente junto al resto de las operaciones.',
      departamento: 'Libros contables',
      destino: destinoEtapa(compra, 'diario', DESTINO_DIARIO),
      tipoOperacion: 'compra',
      operacionId: compra?.id ?? null,
    },
    {
      clave: 'libro-mayor',
      numero: 9,
      titulo: 'Seleccionar una cuenta en el Libro Mayor',
      descripcion: compra?.cuentaPrincipal
        ? `Movimientos y saldo de la cuenta ${compra.cuentaPrincipal}, derivados del Diario.`
        : 'Movimientos y saldo de la cuenta imputada por la operación.',
      departamento: 'Libros contables',
      destino: destinoEtapa(compra, 'mayor', DESTINO_MAYOR),
      tipoOperacion: 'compra',
      operacionId: compra?.id ?? null,
    },
    {
      clave: 'balance-comprobacion',
      numero: 10,
      titulo: 'Consultar el balance de comprobación',
      descripcion: 'Sumas y saldos del período, con verificación de Debe = Haber.',
      departamento: 'Estados contables',
      destino: destinoEtapa(compra, 'balance', DESTINO_BALANCE),
      tipoOperacion: 'compra',
      operacionId: compra?.id ?? null,
    },
    {
      clave: 'registrar-venta',
      numero: 11,
      titulo: 'Realizar una operación de venta',
      descripcion: 'Emisión de la factura al cliente y generación de la cuenta por cobrar.',
      departamento: 'Ventas',
      destino: DESTINO_NUEVA_VENTA,
      tipoOperacion: 'venta',
      operacionId: venta?.id ?? null,
    },
    {
      clave: 'cobro-cliente',
      numero: 12,
      titulo: 'Registrar el cobro',
      descripcion: venta
        ? `Cobro de la venta ${venta.numero} con aplicación contra la cuenta por cobrar.`
        : 'Tesorería acredita el cobro y cancela total o parcialmente la cuenta por cobrar.',
      departamento: 'Tesorería',
      destino: destinoEtapa(venta, 'tesoreria', {
        path: '/tesoreria',
        query: { vista: 'cobros' },
      }),
      tipoOperacion: 'venta',
      operacionId: venta?.id ?? null,
    },
    {
      clave: 'comprobar-contabilidad',
      numero: 13,
      titulo: 'Comprobar la actualización contable',
      descripcion:
        'La venta y su cobro impactan en el Diario, el Mayor y el Balance de Comprobación.',
      departamento: 'Estados contables',
      destino: destinoEtapa(venta, 'balance', DESTINO_BALANCE),
      tipoOperacion: 'venta',
      operacionId: venta?.id ?? null,
    },
  ]
}
