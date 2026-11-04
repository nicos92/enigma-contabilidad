import type {
  Cliente,
  Compra,
  Cobro,
  Pago,
  Producto,
  Proveedor,
  Venta,
  CondicionIva,
  TipoProducto,
} from '@/types/contabilidad'

/* -------------------------------------------------------------------------- */
/* Catálogos                                                                  */
/* -------------------------------------------------------------------------- */

export const CONDICIONES_IVA: readonly CondicionIva[] = [
  'Responsable Inscripto',
  'Monotributo',
  'Exento',
]

export const TIPOS_PRODUCTO: readonly TipoProducto[] = ['producto', 'servicio']

export const ALICUOTAS_IVA_MAESTRO = [21, 10.5, 0] as const

/* -------------------------------------------------------------------------- */
/* Helpers de texto                                                           */
/* -------------------------------------------------------------------------- */

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function esEmailValido(email: string): boolean {
  if (!email.trim()) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function esCuitValido(cuit: string): boolean {
  return /^\d{2}-\d{8}-\d$/.test(cuit.trim())
}

/* -------------------------------------------------------------------------- */
/* Filtros                                                                    */
/* -------------------------------------------------------------------------- */

export interface FiltrosMaestro {
  texto: string
}

export function filtrosMaestroVacios(): FiltrosMaestro {
  return { texto: '' }
}

export function filtrarProveedores(
  proveedores: readonly Proveedor[],
  filtros: FiltrosMaestro,
): Proveedor[] {
  const consulta = normalizarTexto(filtros.texto)
  if (!consulta) return [...proveedores]
  return proveedores.filter((proveedor) =>
    [proveedor.nombre, proveedor.cuit, proveedor.email, proveedor.telefono, proveedor.direccion]
      .map(normalizarTexto)
      .some((valor) => valor.includes(consulta)),
  )
}

export function filtrarClientes(clientes: readonly Cliente[], filtros: FiltrosMaestro): Cliente[] {
  const consulta = normalizarTexto(filtros.texto)
  if (!consulta) return [...clientes]
  return clientes.filter((cliente) =>
    [cliente.nombre, cliente.cuit, cliente.email, cliente.telefono, cliente.direccion]
      .map(normalizarTexto)
      .some((valor) => valor.includes(consulta)),
  )
}

export function filtrarProductos(
  productos: readonly Producto[],
  filtros: FiltrosMaestro,
): Producto[] {
  const consulta = normalizarTexto(filtros.texto)
  if (!consulta) return [...productos]
  return productos.filter((producto) =>
    [producto.codigo, producto.nombre, producto.tipo]
      .map(normalizarTexto)
      .some((valor) => valor.includes(consulta)),
  )
}

/* -------------------------------------------------------------------------- */
/* Numeración / ids                                                           */
/* -------------------------------------------------------------------------- */

export function siguienteIdProveedor(proveedores: readonly Proveedor[]): string {
  const maximo = proveedores.reduce((max, proveedor) => {
    const coincidencia = /^PRV-(\d+)$/.exec(proveedor.id)
    if (!coincidencia) return max
    return Math.max(max, Number.parseInt(coincidencia[1] ?? '0', 10))
  }, 0)
  return `PRV-${String(maximo + 1).padStart(2, '0')}`
}

export function siguienteIdCliente(clientes: readonly Cliente[]): string {
  const maximo = clientes.reduce((max, cliente) => {
    const coincidencia = /^CLI-(\d+)$/.exec(cliente.id)
    if (!coincidencia) return max
    return Math.max(max, Number.parseInt(coincidencia[1] ?? '0', 10))
  }, 0)
  return `CLI-${String(maximo + 1).padStart(2, '0')}`
}

export function siguienteIdProducto(productos: readonly Producto[]): string {
  const maximo = productos.reduce((max, producto) => {
    const coincidencia = /^(PROD|SERV)-(\d+)$/.exec(producto.id)
    if (!coincidencia) return max
    return Math.max(max, Number.parseInt(coincidencia[2] ?? '0', 10))
  }, 0)
  const prefijo = 'PROD'
  return `${prefijo}-${String(maximo + 1).padStart(2, '0')}`
}

/* -------------------------------------------------------------------------- */
/* Uso / eliminación                                                          */
/* -------------------------------------------------------------------------- */

export function proveedorUsado(
  proveedorId: string,
  compras: readonly Compra[],
  pagos: readonly Pago[],
): boolean {
  return (
    compras.some((compra) => compra.proveedorId === proveedorId) ||
    pagos.some((pago) => pago.proveedorId === proveedorId)
  )
}

export function clienteUsado(
  clienteId: string,
  ventas: readonly Venta[],
  cobros: readonly Cobro[],
): boolean {
  return (
    ventas.some((venta) => venta.clienteId === clienteId) ||
    cobros.some((cobro) => cobro.clienteId === clienteId)
  )
}

export function productoUsado(
  productoId: string,
  compras: readonly Compra[],
  ventas: readonly Venta[],
): boolean {
  return (
    compras.some((compra) => compra.items.some((item) => item.productoId === productoId)) ||
    ventas.some((venta) => venta.items.some((item) => item.productoId === productoId))
  )
}

/* -------------------------------------------------------------------------- */
/* Validación                                                                 */
/* -------------------------------------------------------------------------- */

export interface ErroresProveedor {
  nombre?: string
  cuit?: string
  email?: string
  telefono?: string
  direccion?: string
  condicionIva?: string
}

export interface ErroresCliente {
  nombre?: string
  cuit?: string
  email?: string
  telefono?: string
  direccion?: string
  condicionIva?: string
}

export interface ErroresProducto {
  codigo?: string
  nombre?: string
  tipo?: string
  precioVenta?: string
  costo?: string
  alicuotaIva?: string
  stockInicial?: string
  puntoReposicion?: string
  cuentaCompra?: string
  cuentaIngreso?: string
  cuentaCosto?: string
}

export interface EntradaValidacionProveedor {
  id?: string
  nombre: string
  cuit: string
  email: string
  telefono: string
  direccion: string
  condicionIva: string
}

export function validarProveedor(
  entrada: EntradaValidacionProveedor,
  proveedores: readonly Proveedor[],
  idActual?: string,
): ErroresProveedor {
  const errores: ErroresProveedor = {}

  if (!entrada.nombre.trim()) errores.nombre = 'Ingresá el nombre del proveedor.'
  if (!entrada.cuit.trim()) {
    errores.cuit = 'Ingresá el CUIT.'
  } else if (!esCuitValido(entrada.cuit)) {
    errores.cuit = 'El CUIT debe tener el formato 00-00000000-0.'
  } else if (
    proveedores.some(
      (proveedor) =>
        proveedor.cuit === entrada.cuit.trim() && proveedor.id !== (idActual ?? entrada.id),
    )
  ) {
    errores.cuit = 'Ya existe un proveedor con ese CUIT.'
  }
  if (!esEmailValido(entrada.email)) errores.email = 'Ingresá un email válido.'
  if (!entrada.condicionIva) errores.condicionIva = 'Seleccioná la condición de IVA.'

  return errores
}

export function hayErroresProveedor(errores: ErroresProveedor): boolean {
  return Object.keys(errores).length > 0
}

export interface EntradaValidacionCliente {
  id?: string
  nombre: string
  cuit: string
  email: string
  telefono: string
  direccion: string
  condicionIva: string
}

export function validarCliente(
  entrada: EntradaValidacionCliente,
  clientes: readonly Cliente[],
  idActual?: string,
): ErroresCliente {
  const errores: ErroresCliente = {}

  if (!entrada.nombre.trim()) errores.nombre = 'Ingresá el nombre del cliente.'
  if (!entrada.cuit.trim()) {
    errores.cuit = 'Ingresá el CUIT.'
  } else if (!esCuitValido(entrada.cuit)) {
    errores.cuit = 'El CUIT debe tener el formato 00-00000000-0.'
  } else if (
    clientes.some(
      (cliente) => cliente.cuit === entrada.cuit.trim() && cliente.id !== (idActual ?? entrada.id),
    )
  ) {
    errores.cuit = 'Ya existe un cliente con ese CUIT.'
  }
  if (!esEmailValido(entrada.email)) errores.email = 'Ingresá un email válido.'
  if (!entrada.condicionIva) errores.condicionIva = 'Seleccioná la condición de IVA.'

  return errores
}

export function hayErroresCliente(errores: ErroresCliente): boolean {
  return Object.keys(errores).length > 0
}

export interface EntradaValidacionProducto {
  id?: string
  codigo: string
  nombre: string
  tipo: string
  precioVenta: number
  costo: number
  alicuotaIva: number
  stockInicial: number
  puntoReposicion: number
  cuentaCompra: string
  cuentaIngreso: string
  cuentaCosto: string
}

export function validarProducto(
  entrada: EntradaValidacionProducto,
  productos: readonly Producto[],
  idActual?: string,
): ErroresProducto {
  const errores: ErroresProducto = {}

  if (!entrada.codigo.trim()) {
    errores.codigo = 'Ingresá el código.'
  } else if (
    productos.some(
      (producto) =>
        producto.codigo === entrada.codigo.trim() && producto.id !== (idActual ?? entrada.id),
    )
  ) {
    errores.codigo = 'Ya existe un producto con ese código.'
  }
  if (!entrada.nombre.trim()) errores.nombre = 'Ingresá el nombre.'
  if (!entrada.tipo) errores.tipo = 'Seleccioná el tipo.'
  if (!Number.isInteger(entrada.precioVenta) || entrada.precioVenta < 0) {
    errores.precioVenta = 'El precio de venta debe ser un entero mayor o igual a cero.'
  }
  if (!Number.isInteger(entrada.costo) || entrada.costo < 0) {
    errores.costo = 'El costo debe ser un entero mayor o igual a cero.'
  }
  if (!Number.isFinite(entrada.alicuotaIva) || entrada.alicuotaIva < 0) {
    errores.alicuotaIva = 'Seleccioná una alícuota válida.'
  }
  if (!Number.isInteger(entrada.stockInicial) || entrada.stockInicial < 0) {
    errores.stockInicial = 'El stock inicial debe ser un entero mayor o igual a cero.'
  }
  if (!Number.isInteger(entrada.puntoReposicion) || entrada.puntoReposicion < 0) {
    errores.puntoReposicion = 'El punto de reposición debe ser un entero mayor o igual a cero.'
  }
  if (!entrada.cuentaCompra) errores.cuentaCompra = 'Seleccioná la cuenta de compra.'
  if (!entrada.cuentaIngreso) errores.cuentaIngreso = 'Seleccioná la cuenta de ingreso.'
  if (!entrada.cuentaCosto) errores.cuentaCosto = 'Seleccioná la cuenta de costo.'

  return errores
}

export function hayErroresProducto(errores: ErroresProducto): boolean {
  return Object.keys(errores).length > 0
}

/* -------------------------------------------------------------------------- */
/* Historial                                                                  */
/* -------------------------------------------------------------------------- */

export function comprasDeProveedor(proveedorId: string, compras: readonly Compra[]): Compra[] {
  return compras
    .filter((compra) => compra.proveedorId === proveedorId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
}

export function pagosDeProveedor(proveedorId: string, pagos: readonly Pago[]): Pago[] {
  return pagos
    .filter((pago) => pago.proveedorId === proveedorId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
}

export function ventasDeCliente(clienteId: string, ventas: readonly Venta[]): Venta[] {
  return ventas
    .filter((venta) => venta.clienteId === clienteId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
}

export function cobrosDeCliente(clienteId: string, cobros: readonly Cobro[]): Cobro[] {
  return cobros
    .filter((cobro) => cobro.clienteId === clienteId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
}

export function asientosVinculadosProveedor(
  proveedorId: string,
  compras: readonly Compra[],
  pagos: readonly Pago[],
  asientos: readonly import('@/types/contabilidad').Asiento[],
): import('@/types/contabilidad').Asiento[] {
  const ids = new Set<string>()
  for (const compra of compras) {
    if (compra.proveedorId === proveedorId) ids.add(compra.asientoId)
  }
  for (const pago of pagos) {
    if (pago.proveedorId === proveedorId) ids.add(pago.asientoId)
  }
  return asientos.filter((asiento) => ids.has(asiento.id))
}

export function asientosVinculadosCliente(
  clienteId: string,
  ventas: readonly Venta[],
  cobros: readonly Cobro[],
  asientos: readonly import('@/types/contabilidad').Asiento[],
): import('@/types/contabilidad').Asiento[] {
  const ids = new Set<string>()
  for (const venta of ventas) {
    if (venta.clienteId === clienteId) ids.add(venta.asientoId)
  }
  for (const cobro of cobros) {
    if (cobro.clienteId === clienteId) ids.add(cobro.asientoId)
  }
  return asientos.filter((asiento) => ids.has(asiento.id))
}

export function asientosVinculadosProducto(
  productoId: string,
  compras: readonly Compra[],
  ventas: readonly Venta[],
  asientos: readonly import('@/types/contabilidad').Asiento[],
): import('@/types/contabilidad').Asiento[] {
  const ids = new Set<string>()
  for (const compra of compras) {
    if (compra.items.some((item) => item.productoId === productoId)) ids.add(compra.asientoId)
  }
  for (const venta of ventas) {
    if (venta.items.some((item) => item.productoId === productoId)) ids.add(venta.asientoId)
  }
  return asientos.filter((asiento) => ids.has(asiento.id))
}
