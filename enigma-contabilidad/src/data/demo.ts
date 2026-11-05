import {
  AMORTIZACION_MENSUAL_EQUIPOS,
  APERTURA_DEMO,
  CLIENTES,
  EMPRESA_DEMO,
  PERIODO_DEMO,
  PRODUCTOS,
  PROVEEDORES,
  USUARIO_DEMO,
} from '@/data/catalogos'
import { CODIGOS, CUENTAS } from '@/data/plan-cuentas'
import {
  construirAsiento,
  generarAsientoAmortizacion,
  generarAsientoApertura,
  generarAsientoCobro,
  generarAsientoCompra,
  generarAsientoImpuestoGanancias,
  generarAsientoLiquidacionIva,
  generarAsientoPago,
  generarAsientoTransferencia,
  generarAsientoVenta,
  lineaDebe,
  lineaHaber,
  numerarAsientos,
} from '@/core/contabilidad/asientos'
import {
  derivarBalanceComprobacion,
  derivarEstadoResultados,
  derivarLibroDiario,
  derivarLibroMayor,
  derivarMovimientosTesoreria,
  estadoCobroVenta,
  estadoPagoCompra,
} from '@/core/contabilidad/derivaciones'
import { calcularPorcentaje, calcularTotales } from '@/core/dinero'
import { VERSION_ESQUEMA } from '@/core/version'
import type { FechaISO } from '@/types'
import type {
  Asiento,
  Cliente,
  Cobro,
  Compra,
  DatosEmpresa,
  DocumentoContable,
  EstadoContable,
  EstadoDocumento,
  ItemCompra,
  ItemVenta,
  LineaAsiento,
  MedioPago,
  OrigenAsiento,
  OrigenDocumento,
  Pago,
  Producto,
  Proveedor,
  TipoDocumento,
  Transferencia,
  Venta,
} from '@/types/contabilidad'

/* -------------------------------------------------------------------------- */
/* Helpers de construcción                                                    */
/* -------------------------------------------------------------------------- */

interface DatosDocumento {
  id: string
  numero: string
  tipo: TipoDocumento
  origen: OrigenDocumento
  fecha: FechaISO
  descripcion: string
  contraparte: string | null
  importe: number
  asientoId: string
  operacionId: string | null
  estado?: EstadoDocumento
}

function crearDocumento(datos: DatosDocumento): DocumentoContable {
  return {
    ...datos,
    estado: datos.estado ?? 'registrado',
  }
}

function itemCompra(
  producto: Producto,
  cantidad: number,
  precioUnitario = producto.costo,
): ItemCompra {
  return {
    productoId: producto.id,
    descripcion: producto.nombre,
    cantidad,
    precioUnitario,
    alicuotaIva: producto.alicuotaIva,
    cuentaContable: producto.cuentaCompra,
  }
}

function itemVenta(producto: Producto, cantidad: number): ItemVenta {
  return {
    productoId: producto.id,
    descripcion: producto.nombre,
    cantidad,
    precioUnitario: producto.precioVenta,
    alicuotaIva: producto.alicuotaIva,
    costoUnitario: producto.costo,
    cuentaIngreso: producto.cuentaIngreso,
    cuentaCosto: producto.cuentaCosto,
  }
}

interface DatosCompra {
  id: string
  numero: string
  fecha: FechaISO
  vencimiento: FechaISO
  proveedor: Proveedor
  tipoComprobante: string
  condicionPago: Compra['condicionPago']
  items: ItemCompra[]
  estadoDocumento?: EstadoDocumento
}

function crearCompra(datos: DatosCompra): {
  compra: Compra
  asiento: Asiento
  documento: DocumentoContable
} {
  const totales = calcularTotales(datos.items)
  const compra: Compra = {
    id: datos.id,
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
    documentoId: `doc-compra-${datos.id}`,
    asientoId: `asiento-compra-${datos.id}`,
  }

  const asiento = generarAsientoCompra(compra, `Compra ${datos.numero} - ${datos.proveedor.nombre}`)

  const documento = crearDocumento({
    id: compra.documentoId,
    numero: compra.numero,
    tipo: 'factura_recibida',
    origen: 'compras',
    fecha: compra.fecha,
    descripcion: `Factura recibida ${compra.numero} - ${datos.proveedor.nombre}`,
    contraparte: datos.proveedor.nombre,
    importe: compra.total,
    asientoId: compra.asientoId,
    operacionId: compra.id,
    estado: datos.estadoDocumento,
  })

  return { compra, asiento, documento }
}

interface DatosVenta {
  id: string
  numero: string
  fecha: FechaISO
  vencimiento: FechaISO
  cliente: Cliente
  tipoComprobante: string
  condicionVenta: Venta['condicionVenta']
  items: ItemVenta[]
  estadoDocumento?: EstadoDocumento
}

function crearVenta(datos: DatosVenta): {
  venta: Venta
  asiento: Asiento
  documento: DocumentoContable
} {
  const totales = calcularTotales(datos.items)
  const venta: Venta = {
    id: datos.id,
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
    documentoId: `doc-venta-${datos.id}`,
    asientoId: `asiento-venta-${datos.id}`,
  }

  const asiento = generarAsientoVenta(venta, `Venta ${datos.numero} - ${datos.cliente.nombre}`)

  const documento = crearDocumento({
    id: venta.documentoId,
    numero: venta.numero,
    tipo: 'factura_emitida',
    origen: 'ventas',
    fecha: venta.fecha,
    descripcion: `Factura emitida ${venta.numero} - ${datos.cliente.nombre}`,
    contraparte: datos.cliente.nombre,
    importe: venta.total,
    asientoId: venta.asientoId,
    operacionId: venta.id,
    estado: datos.estadoDocumento,
  })

  return { venta, asiento, documento }
}

interface DatosPago {
  id: string
  numero: string
  fecha: FechaISO
  compra: Compra
  proveedor: Proveedor
  importe: number
  medio: MedioPago
  observaciones?: string
}

function crearPago(datos: DatosPago): {
  pago: Pago
  asiento: Asiento
  documento: DocumentoContable
} {
  const cuentaId = datos.medio === 'caja' ? CODIGOS.CAJA : CODIGOS.BANCO
  const pago: Pago = {
    id: datos.id,
    numero: datos.numero,
    fecha: datos.fecha,
    compraId: datos.compra.id,
    proveedorId: datos.proveedor.id,
    importe: datos.importe,
    medio: datos.medio,
    cuentaId,
    observaciones: datos.observaciones ?? '',
    documentoId: `doc-pago-${datos.id}`,
    asientoId: `asiento-pago-${datos.id}`,
  }

  const asiento = generarAsientoPago(pago, `Pago ${datos.numero} - ${datos.proveedor.nombre}`)

  const documento = crearDocumento({
    id: pago.documentoId,
    numero: pago.numero,
    tipo: 'comprobante_pago',
    origen: 'tesoreria',
    fecha: pago.fecha,
    descripcion: `Comprobante de pago ${pago.numero} - ${datos.proveedor.nombre}`,
    contraparte: datos.proveedor.nombre,
    importe: pago.importe,
    asientoId: pago.asientoId,
    operacionId: pago.id,
  })

  return { pago, asiento, documento }
}

interface DatosCobro {
  id: string
  numero: string
  fecha: FechaISO
  venta: Venta
  cliente: Cliente
  importe: number
  medio: MedioPago
  observaciones?: string
}

function crearCobro(datos: DatosCobro): {
  cobro: Cobro
  asiento: Asiento
  documento: DocumentoContable
} {
  const cuentaId = datos.medio === 'caja' ? CODIGOS.CAJA : CODIGOS.BANCO
  const cobro: Cobro = {
    id: datos.id,
    numero: datos.numero,
    fecha: datos.fecha,
    ventaId: datos.venta.id,
    clienteId: datos.cliente.id,
    importe: datos.importe,
    medio: datos.medio,
    cuentaId,
    observaciones: datos.observaciones ?? '',
    documentoId: `doc-cobro-${datos.id}`,
    asientoId: `asiento-cobro-${datos.id}`,
  }

  const asiento = generarAsientoCobro(cobro, `Cobro ${datos.numero} - ${datos.cliente.nombre}`)

  const documento = crearDocumento({
    id: cobro.documentoId,
    numero: cobro.numero,
    tipo: 'recibo',
    origen: 'tesoreria',
    fecha: cobro.fecha,
    descripcion: `Recibo de cobro ${cobro.numero} - ${datos.cliente.nombre}`,
    contraparte: datos.cliente.nombre,
    importe: cobro.importe,
    asientoId: cobro.asientoId,
    operacionId: cobro.id,
  })

  return { cobro, asiento, documento }
}

interface DatosTransferencia {
  id: string
  numero: string
  fecha: FechaISO
  cuentaOrigenId: string
  cuentaDestinoId: string
  importe: number
  descripcion: string
}

function crearTransferencia(datos: DatosTransferencia): {
  transferencia: Transferencia
  asiento: Asiento
  documento: DocumentoContable
} {
  const transferencia: Transferencia = {
    ...datos,
    documentoId: `doc-transferencia-${datos.id}`,
    asientoId: `asiento-transferencia-${datos.id}`,
  }

  const asiento = generarAsientoTransferencia(transferencia)

  const documento = crearDocumento({
    id: transferencia.documentoId,
    numero: transferencia.numero,
    tipo: 'transferencia',
    origen: 'tesoreria',
    fecha: transferencia.fecha,
    descripcion: `Transferencia interna ${transferencia.numero}`,
    contraparte: null,
    importe: transferencia.importe,
    asientoId: transferencia.asientoId,
    operacionId: transferencia.id,
  })

  return { transferencia, asiento, documento }
}

interface DatosAsientoManual {
  id: string
  fecha: FechaISO
  concepto: string
  origen: OrigenAsiento
  origenId: string
  documentoId: string
  numeroDocumento: string
  descripcionDocumento: string
  contraparte: string | null
  importe: number
  lineas: LineaAsiento[]
}

function crearAsientoManual(datos: DatosAsientoManual): {
  asiento: Asiento
  documento: DocumentoContable
} {
  const asiento = construirAsiento({
    id: datos.id,
    fecha: datos.fecha,
    concepto: datos.concepto,
    origen: datos.origen,
    origenId: datos.origenId,
    documentoId: datos.documentoId,
    lineas: datos.lineas,
    estado: 'registrado',
  })

  const documento = crearDocumento({
    id: datos.documentoId,
    numero: datos.numeroDocumento,
    tipo: 'asiento_ajuste',
    origen: 'contaduria',
    fecha: datos.fecha,
    descripcion: datos.descripcionDocumento,
    contraparte: datos.contraparte,
    importe: datos.importe,
    asientoId: datos.id,
    operacionId: null,
    estado: 'registrado',
  })

  return { asiento, documento }
}

function prepararEstadoAsientos(asientos: Asiento[], documentos: DocumentoContable[]): void {
  for (const documento of documentos) {
    const asiento = asientos.find((asientoContable) => asientoContable.id === documento.asientoId)
    if (!asiento) {
      throw new Error(`El documento ${documento.id} referencia un asiento inexistente.`)
    }
    asiento.estado = documento.estado === 'registrado' ? 'registrado' : 'propuesto'
  }
}

/* -------------------------------------------------------------------------- */
/* Estado demo                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Construye el estado inicial completo de la demo.
 * La función no comparte referencias con los catálogos originales, de modo que
 * el store pueda mutar documentos y asientos sin contaminar la semilla.
 */
export function crearEstadoDemo(): EstadoContable {
  const cuentas = CUENTAS.map((cuenta) => ({ ...cuenta }))
  const proveedores = PROVEEDORES.map((proveedor) => ({ ...proveedor }))
  const clientes = CLIENTES.map((cliente) => ({ ...cliente }))
  const productos = PRODUCTOS.map((producto) => ({ ...producto }))

  const proveedorPorId = new Map(proveedores.map((proveedor) => [proveedor.id, proveedor]))
  const clientePorId = new Map(clientes.map((cliente) => [cliente.id, cliente]))
  const productoPorId = new Map(productos.map((producto) => [producto.id, producto]))

  function proveedor(id: string): Proveedor {
    const encontrado = proveedorPorId.get(id)
    if (!encontrado) throw new Error(`Proveedor inexistente: ${id}`)
    return encontrado
  }

  function cliente(id: string): Cliente {
    const encontrado = clientePorId.get(id)
    if (!encontrado) throw new Error(`Cliente inexistente: ${id}`)
    return encontrado
  }

  function producto(id: string): Producto {
    const encontrado = productoPorId.get(id)
    if (!encontrado) throw new Error(`Producto inexistente: ${id}`)
    return encontrado
  }

  const compras: Compra[] = []
  const ventas: Venta[] = []
  const pagos: Pago[] = []
  const cobros: Cobro[] = []
  const transferencias: Transferencia[] = []
  const asientos: Asiento[] = []
  const documentos: DocumentoContable[] = []

  /* Apertura -------------------------------------------------------------- */
  const mercaderiasIniciales = productos.reduce(
    (total, productoActual) => total + productoActual.stockInicial * productoActual.costo,
    0,
  )

  const asientoApertura = generarAsientoApertura({
    fecha: '2026-11-01',
    documentoId: 'doc-apertura',
    caja: APERTURA_DEMO.caja,
    banco: APERTURA_DEMO.banco,
    mercaderias: mercaderiasIniciales,
    equipos: APERTURA_DEMO.equipos,
    amortizacionAcumulada: APERTURA_DEMO.amortizacionAcumulada,
  })
  asientoApertura.estado = 'registrado'
  asientos.push(asientoApertura)
  documentos.push(
    crearDocumento({
      id: 'doc-apertura',
      numero: 'AP-2026-0001',
      tipo: 'asiento_apertura',
      origen: 'apertura',
      fecha: '2026-11-01',
      descripcion: 'Asiento de apertura del ejercicio 2026',
      contraparte: null,
      importe: asientoApertura.lineas.reduce((total, linea) => total + linea.debe, 0),
      asientoId: asientoApertura.id,
      operacionId: null,
    }),
  )

  /* Compras --------------------------------------------------------------- */
  const comprasDemo: DatosCompra[] = [
    {
      id: 'C-001',
      numero: 'FC-A-0001-00000101',
      fecha: '2026-11-02',
      vencimiento: '2026-12-02',
      proveedor: proveedor('PRV-01'),
      tipoComprobante: 'Factura A',
      condicionPago: 'cuenta_corriente',
      items: [itemCompra(producto('PROD-01'), 6)],
    },
    {
      id: 'C-002',
      numero: 'FC-A-0001-00000102',
      fecha: '2026-11-03',
      vencimiento: '2026-12-03',
      proveedor: proveedor('PRV-02'),
      tipoComprobante: 'Factura A',
      condicionPago: 'cuenta_corriente',
      items: [itemCompra(producto('PROD-02'), 10)],
    },
    {
      id: 'C-003',
      numero: 'FC-A-0001-00000103',
      fecha: '2026-11-05',
      vencimiento: '2026-11-20',
      proveedor: proveedor('PRV-03'),
      tipoComprobante: 'Factura A',
      condicionPago: 'cuenta_corriente',
      items: [itemCompra(producto('PROD-03'), 20), itemCompra(producto('PROD-04'), 20)],
    },
    {
      id: 'C-004',
      numero: 'FC-A-0001-00000104',
      fecha: '2026-11-07',
      vencimiento: '2026-12-07',
      proveedor: proveedor('PRV-05'),
      tipoComprobante: 'Factura A',
      condicionPago: 'cuenta_corriente',
      items: [itemCompra(producto('PROD-05'), 4)],
    },
    {
      id: 'C-005',
      numero: 'FC-A-0001-00000105',
      fecha: '2026-11-10',
      vencimiento: '2026-12-10',
      proveedor: proveedor('PRV-01'),
      tipoComprobante: 'Factura A',
      condicionPago: 'cuenta_corriente',
      items: [itemCompra(producto('PROD-06'), 15)],
    },
    {
      id: 'C-006',
      numero: 'FC-A-0001-00000106',
      fecha: '2026-11-12',
      vencimiento: '2026-11-27',
      proveedor: proveedor('PRV-04'),
      tipoComprobante: 'Factura A',
      condicionPago: 'cuenta_corriente',
      items: [itemCompra(producto('SERV-01'), 1, producto('SERV-01').precioVenta)],
    },
    {
      id: 'C-007',
      numero: 'FC-A-0001-00000107',
      fecha: '2026-11-15',
      vencimiento: '2026-12-15',
      proveedor: proveedor('PRV-05'),
      tipoComprobante: 'Factura A',
      condicionPago: 'cuenta_corriente',
      items: [itemCompra(producto('PROD-07'), 8)],
    },
    {
      id: 'C-008',
      numero: 'FC-A-0001-00000108',
      fecha: '2026-11-20',
      vencimiento: '2026-12-20',
      proveedor: proveedor('PRV-03'),
      tipoComprobante: 'Factura A',
      condicionPago: 'cuenta_corriente',
      items: [itemCompra(producto('SERV-03'), 1, producto('SERV-03').precioVenta)],
      estadoDocumento: 'en_revision',
    },
  ]

  for (const datos of comprasDemo) {
    const resultado = crearCompra(datos)
    compras.push(resultado.compra)
    asientos.push(resultado.asiento)
    documentos.push(resultado.documento)
  }

  /* Ventas ---------------------------------------------------------------- */
  const ventasDemo: DatosVenta[] = [
    {
      id: 'V-001',
      numero: 'FA-A-0001-00000201',
      fecha: '2026-11-04',
      vencimiento: '2026-12-04',
      cliente: cliente('CLI-03'),
      tipoComprobante: 'Factura A',
      condicionVenta: 'cuenta_corriente',
      items: [itemVenta(producto('PROD-01'), 2)],
    },
    {
      id: 'V-002',
      numero: 'FA-A-0001-00000202',
      fecha: '2026-11-06',
      vencimiento: '2026-12-06',
      cliente: cliente('CLI-01'),
      tipoComprobante: 'Factura A',
      condicionVenta: 'cuenta_corriente',
      items: [itemVenta(producto('PROD-02'), 4)],
    },
    {
      id: 'V-003',
      numero: 'FA-A-0001-00000203',
      fecha: '2026-11-09',
      vencimiento: '2026-11-24',
      cliente: cliente('CLI-02'),
      tipoComprobante: 'Factura A',
      condicionVenta: 'cuenta_corriente',
      items: [itemVenta(producto('PROD-03'), 10), itemVenta(producto('PROD-04'), 10)],
    },
    {
      id: 'V-004',
      numero: 'FA-A-0001-00000204',
      fecha: '2026-11-11',
      vencimiento: '2026-12-11',
      cliente: cliente('CLI-05'),
      tipoComprobante: 'Factura A',
      condicionVenta: 'cuenta_corriente',
      items: [itemVenta(producto('PROD-05'), 3)],
    },
    {
      id: 'V-005',
      numero: 'FA-A-0001-00000205',
      fecha: '2026-11-14',
      vencimiento: '2026-11-29',
      cliente: cliente('CLI-04'),
      tipoComprobante: 'Factura A',
      condicionVenta: 'cuenta_corriente',
      items: [itemVenta(producto('SERV-01'), 1)],
    },
    {
      id: 'V-006',
      numero: 'FA-A-0001-00000206',
      fecha: '2026-11-17',
      vencimiento: '2026-12-17',
      cliente: cliente('CLI-03'),
      tipoComprobante: 'Factura A',
      condicionVenta: 'cuenta_corriente',
      items: [itemVenta(producto('SERV-02'), 1)],
    },
    {
      id: 'V-007',
      numero: 'FA-A-0001-00000207',
      fecha: '2026-11-21',
      vencimiento: '2026-12-21',
      cliente: cliente('CLI-01'),
      tipoComprobante: 'Factura A',
      condicionVenta: 'cuenta_corriente',
      items: [itemVenta(producto('PROD-06'), 5)],
    },
    {
      id: 'V-008',
      numero: 'FA-A-0001-00000208',
      fecha: '2026-11-24',
      vencimiento: '2026-12-24',
      cliente: cliente('CLI-05'),
      tipoComprobante: 'Factura A',
      condicionVenta: 'cuenta_corriente',
      items: [itemVenta(producto('SERV-03'), 1)],
      estadoDocumento: 'pendiente',
    },
  ]

  for (const datos of ventasDemo) {
    const resultado = crearVenta(datos)
    ventas.push(resultado.venta)
    asientos.push(resultado.asiento)
    documentos.push(resultado.documento)
  }

  /* Pagos ----------------------------------------------------------------- */
  const pagosDemo: DatosPago[] = [
    {
      id: 'P-001',
      numero: 'CP-0001-00000051',
      fecha: '2026-11-06',
      compra: compras[0]!,
      proveedor: proveedor('PRV-01'),
      importe: 350_000_000,
      medio: 'banco',
      observaciones: 'Pago parcial de la factura C-001',
    },
    {
      id: 'P-002',
      numero: 'CP-0001-00000052',
      fecha: '2026-11-09',
      compra: compras[1]!,
      proveedor: proveedor('PRV-02'),
      importe: 338_800_000,
      medio: 'banco',
      observaciones: 'Cancelación total de la factura C-002',
    },
    {
      id: 'P-003',
      numero: 'CP-0001-00000053',
      fecha: '2026-11-13',
      compra: compras[2]!,
      proveedor: proveedor('PRV-03'),
      importe: 225_060_000,
      medio: 'banco',
      observaciones: 'Cancelación total de la factura C-003',
    },
    {
      id: 'P-004',
      numero: 'CP-0001-00000054',
      fecha: '2026-11-18',
      compra: compras[3]!,
      proveedor: proveedor('PRV-05'),
      importe: 154_880_000,
      medio: 'banco',
      observaciones: 'Cancelación total de la factura C-004',
    },
    {
      id: 'P-005',
      numero: 'CP-0001-00000055',
      fecha: '2026-11-25',
      compra: compras[5]!,
      proveedor: proveedor('PRV-04'),
      importe: 42_350_000,
      medio: 'caja',
      observaciones: 'Cancelación total de la factura C-006',
    },
  ]

  for (const datos of pagosDemo) {
    const resultado = crearPago(datos)
    pagos.push(resultado.pago)
    asientos.push(resultado.asiento)
    documentos.push(resultado.documento)
  }

  /* Cobros ---------------------------------------------------------------- */
  const cobrosDemo: DatosCobro[] = [
    {
      id: 'K-001',
      numero: 'RC-0001-00000061',
      fecha: '2026-11-08',
      venta: ventas[0]!,
      cliente: cliente('CLI-03'),
      importe: 150_000_000,
      medio: 'banco',
      observaciones: 'Cobro parcial de la factura V-001',
    },
    {
      id: 'K-002',
      numero: 'RC-0001-00000062',
      fecha: '2026-11-12',
      venta: ventas[1]!,
      cliente: cliente('CLI-01'),
      importe: 203_280_000,
      medio: 'banco',
      observaciones: 'Cancelación total de la factura V-002',
    },
    {
      id: 'K-003',
      numero: 'RC-0001-00000063',
      fecha: '2026-11-16',
      venta: ventas[2]!,
      cliente: cliente('CLI-02'),
      importe: 191_180_000,
      medio: 'banco',
      observaciones: 'Cancelación total de la factura V-003',
    },
    {
      id: 'K-004',
      numero: 'RC-0001-00000064',
      fecha: '2026-11-19',
      venta: ventas[3]!,
      cliente: cliente('CLI-05'),
      importe: 174_240_000,
      medio: 'banco',
      observaciones: 'Cancelación total de la factura V-004',
    },
    {
      id: 'K-005',
      numero: 'RC-0001-00000065',
      fecha: '2026-11-26',
      venta: ventas[4]!,
      cliente: cliente('CLI-04'),
      importe: 42_350_000,
      medio: 'caja',
      observaciones: 'Cancelación total de la factura V-005',
    },
  ]

  for (const datos of cobrosDemo) {
    const resultado = crearCobro(datos)
    cobros.push(resultado.cobro)
    asientos.push(resultado.asiento)
    documentos.push(resultado.documento)
  }

  /* Transferencia interna ------------------------------------------------- */
  const resultadoTransferencia = crearTransferencia({
    id: 'T-001',
    numero: 'TR-0001-00000001',
    fecha: '2026-11-22',
    cuentaOrigenId: CODIGOS.BANCO,
    cuentaDestinoId: CODIGOS.CAJA,
    importe: 20_000_000,
    descripcion: 'Reposición de fondo fijo de caja desde banco',
  })
  transferencias.push(resultadoTransferencia.transferencia)
  asientos.push(resultadoTransferencia.asiento)
  documentos.push(resultadoTransferencia.documento)

  /* Gastos devengados y ajustes ------------------------------------------- */
  const gastosDevengados: DatosAsientoManual[] = [
    {
      id: 'asiento-gasto-sueldos',
      fecha: '2026-11-28',
      concepto: 'Liquidación de sueldos y cargas sociales de noviembre',
      origen: 'gasto',
      origenId: 'sueldos-noviembre',
      documentoId: 'doc-gasto-sueldos',
      numeroDocumento: 'AJ-2026-0001',
      descripcionDocumento: 'Liquidación de sueldos y cargas sociales',
      contraparte: 'Personal',
      importe: 150_000_000,
      lineas: [
        lineaDebe(CODIGOS.SUELDOS, 120_000_000, 'Sueldos del período'),
        lineaDebe(CODIGOS.CARGAS_SOCIALES, 30_000_000, 'Cargas sociales del período'),
        lineaHaber(CODIGOS.SUELDOS_A_PAGAR, 120_000_000, 'Sueldos a pagar'),
        lineaHaber(CODIGOS.CARGAS_SOCIALES_A_PAGAR, 30_000_000, 'Cargas sociales a pagar'),
      ],
    },
    {
      id: 'asiento-gasto-alquiler',
      fecha: '2026-11-30',
      concepto: 'Devengamiento del alquiler de oficinas',
      origen: 'gasto',
      origenId: 'alquiler-noviembre',
      documentoId: 'doc-gasto-alquiler',
      numeroDocumento: 'AJ-2026-0002',
      descripcionDocumento: 'Alquiler de oficinas de noviembre',
      contraparte: 'Inmobiliaria Central',
      importe: 45_000_000,
      lineas: [
        lineaDebe(CODIGOS.ALQUILERES, 45_000_000, 'Alquiler del período'),
        lineaHaber(CODIGOS.GASTOS_A_PAGAR, 45_000_000, 'Alquiler a pagar'),
      ],
    },
    {
      id: 'asiento-gasto-servicios',
      fecha: '2026-11-30',
      concepto: 'Devengamiento de servicios básicos',
      origen: 'gasto',
      origenId: 'servicios-noviembre',
      documentoId: 'doc-gasto-servicios',
      numeroDocumento: 'AJ-2026-0003',
      descripcionDocumento: 'Servicios básicos de noviembre',
      contraparte: 'Prestadores de servicios',
      importe: 18_000_000,
      lineas: [
        lineaDebe(CODIGOS.SERVICIOS_BASICOS, 18_000_000, 'Luz, agua e internet'),
        lineaHaber(CODIGOS.GASTOS_A_PAGAR, 18_000_000, 'Servicios a pagar'),
      ],
    },
    {
      id: 'asiento-gasto-honorarios',
      fecha: '2026-11-30',
      concepto: 'Devengamiento de honorarios profesionales',
      origen: 'gasto',
      origenId: 'honorarios-noviembre',
      documentoId: 'doc-gasto-honorarios',
      numeroDocumento: 'AJ-2026-0004',
      descripcionDocumento: 'Honorarios profesionales de noviembre',
      contraparte: 'Estudio Jurídico Sur',
      importe: 25_000_000,
      lineas: [
        lineaDebe(CODIGOS.HONORARIOS, 25_000_000, 'Honorarios del período'),
        lineaHaber(CODIGOS.GASTOS_A_PAGAR, 25_000_000, 'Honorarios a pagar'),
      ],
    },
    {
      id: 'asiento-gasto-seguros',
      fecha: '2026-11-30',
      concepto: 'Devengamiento de la prima de seguros',
      origen: 'gasto',
      origenId: 'seguros-noviembre',
      documentoId: 'doc-gasto-seguros',
      numeroDocumento: 'AJ-2026-0005',
      descripcionDocumento: 'Prima de seguros de noviembre',
      contraparte: 'Aseguradora del Sur',
      importe: 8_000_000,
      lineas: [
        lineaDebe(CODIGOS.SEGUROS, 8_000_000, 'Prima del período'),
        lineaHaber(CODIGOS.GASTOS_A_PAGAR, 8_000_000, 'Seguro a pagar'),
      ],
    },
    {
      id: 'asiento-gasto-bancarios',
      fecha: '2026-11-30',
      concepto: 'Comisiones y gastos bancarios del período',
      origen: 'gasto',
      origenId: 'gastos-bancarios-noviembre',
      documentoId: 'doc-gasto-bancarios',
      numeroDocumento: 'AJ-2026-0006',
      descripcionDocumento: 'Comisiones y gastos bancarios',
      contraparte: 'Banco del Sur',
      importe: 2_500_000,
      lineas: [
        lineaDebe(CODIGOS.GASTOS_BANCARIOS, 2_500_000, 'Comisiones bancarias'),
        lineaHaber(CODIGOS.BANCO, 2_500_000, 'Débito de comisiones'),
      ],
    },
  ]

  for (const datos of gastosDevengados) {
    const resultado = crearAsientoManual(datos)
    asientos.push(resultado.asiento)
    documentos.push(resultado.documento)
  }

  /* Amortización ---------------------------------------------------------- */
  const asientoAmortizacion = generarAsientoAmortizacion({
    fecha: '2026-11-30',
    importe: AMORTIZACION_MENSUAL_EQUIPOS,
    documentoId: 'doc-amortizacion',
    concepto: 'Amortización mensual de equipos de oficina',
  })
  asientoAmortizacion.estado = 'registrado'
  asientos.push(asientoAmortizacion)
  documentos.push(
    crearDocumento({
      id: 'doc-amortizacion',
      numero: 'AJ-2026-0007',
      tipo: 'asiento_ajuste',
      origen: 'contaduria',
      fecha: '2026-11-30',
      descripcion: 'Amortización mensual de equipos de oficina',
      contraparte: null,
      importe: AMORTIZACION_MENSUAL_EQUIPOS,
      asientoId: asientoAmortizacion.id,
      operacionId: null,
    }),
  )

  /* Sincronización de estados --------------------------------------------- */
  prepararEstadoAsientos(asientos, documentos)

  /* Liquidación de IVA ---------------------------------------------------- */
  const documentosRegistrados = new Set(
    documentos
      .filter((documento) => documento.estado === 'registrado')
      .map((documento) => documento.id),
  )
  const ivaCredito = compras
    .filter((compra) => documentosRegistrados.has(compra.documentoId))
    .reduce((total, compra) => total + compra.iva, 0)
  const ivaDebito = ventas
    .filter((venta) => documentosRegistrados.has(venta.documentoId))
    .reduce((total, venta) => total + venta.iva, 0)

  const asientoIva = generarAsientoLiquidacionIva({
    fecha: '2026-11-30',
    ivaDebito,
    ivaCredito,
    documentoId: 'doc-liquidacion-iva',
    concepto: 'Liquidación mensual de IVA de noviembre',
  })
  asientoIva.estado = 'registrado'
  asientos.push(asientoIva)
  documentos.push(
    crearDocumento({
      id: 'doc-liquidacion-iva',
      numero: 'AJ-2026-0008',
      tipo: 'liquidacion_iva',
      origen: 'contaduria',
      fecha: '2026-11-30',
      descripcion: 'Liquidación mensual de IVA',
      contraparte: null,
      importe: Math.abs(ivaDebito - ivaCredito),
      asientoId: asientoIva.id,
      operacionId: null,
    }),
  )

  /* Impuesto a las ganancias ---------------------------------------------- */
  const diarioSinImpuesto = derivarLibroDiario(asientos, cuentas)
  const mayorSinImpuesto = derivarLibroMayor(diarioSinImpuesto, cuentas)
  const balanceSinImpuesto = derivarBalanceComprobacion(mayorSinImpuesto, cuentas)
  const resultadoSinImpuesto = derivarEstadoResultados(balanceSinImpuesto, cuentas)
  const impuestoGanancias =
    resultadoSinImpuesto.resultadoAntesImpuestos > 0
      ? calcularPorcentaje(resultadoSinImpuesto.resultadoAntesImpuestos, 25)
      : 0

  if (impuestoGanancias > 0) {
    const asientoImpuesto = generarAsientoImpuestoGanancias({
      fecha: '2026-11-30',
      importe: impuestoGanancias,
      documentoId: 'doc-impuesto-ganancias',
      concepto: 'Provisión de impuesto a las ganancias del ejercicio',
    })
    asientoImpuesto.estado = 'registrado'
    asientos.push(asientoImpuesto)
    documentos.push(
      crearDocumento({
        id: 'doc-impuesto-ganancias',
        numero: 'AJ-2026-0009',
        tipo: 'provision_impuesto',
        origen: 'contaduria',
        fecha: '2026-11-30',
        descripcion: 'Provisión de impuesto a las ganancias',
        contraparte: 'AFIP',
        importe: impuestoGanancias,
        asientoId: asientoImpuesto.id,
        operacionId: null,
      }),
    )
  }

  /* Estados de pago y cobro ----------------------------------------------- */
  for (const compra of compras) {
    compra.estado = estadoPagoCompra(compra, pagos)
  }
  for (const venta of ventas) {
    venta.estado = estadoCobroVenta(venta, cobros)
  }

  /* Numeración y tesorería ------------------------------------------------ */
  numerarAsientos(asientos)
  const movimientos = derivarMovimientosTesoreria(asientos)

  return {
    version: VERSION_ESQUEMA,
    empresa: { ...EMPRESA_DEMO },
    usuario: { ...USUARIO_DEMO },
    periodo: { ...PERIODO_DEMO },
    cuentas,
    proveedores,
    clientes,
    productos,
    compras,
    ventas,
    pagos,
    cobros,
    transferencias,
    movimientos,
    documentos,
    asientos,
  }
}

/** Datos de empresa usados por la configuración cuando se restaura la demo. */
export const EMPRESA_DEMO_PUBLICA: DatosEmpresa = EMPRESA_DEMO
