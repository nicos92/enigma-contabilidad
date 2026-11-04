import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  asientoBalanceado,
  derivarBalanceComprobacion,
  derivarEstadoResultados,
  derivarEstadoSituacionPatrimonial,
  derivarLibroDiario,
  derivarLibroMayor,
  derivarMovimientosTesoreria,
  derivarSaldosClientes,
  derivarSaldosProveedores,
  derivarSaldosTesoreria,
  derivarStock,
  siguienteNumeroAsiento,
} from '@/core/contabilidad'
import {
  generarCompra,
  siguienteIdCompra,
  siguienteNumeroComprobanteCompra,
  type DatosNuevaCompra,
} from '@/core/compras'
import {
  generarVenta,
  siguienteIdVenta,
  siguienteNumeroComprobanteVenta,
  type DatosNuevaVenta,
} from '@/core/ventas'
import { cargarEstado, guardarEstado, restaurarEstadoDemo } from '@/core/persistencia'
import { crearEstadoDemo } from '@/data/demo'
import { CODIGOS } from '@/data/plan-cuentas'
import type {
  Asiento,
  Compra,
  DatosEmpresa,
  DocumentoContable,
  EstadoContable,
  ItemCompra,
  ItemVenta,
  Proveedor,
  Cliente,
  Producto,
  Venta,
  ResultadoAprobacion,
} from '@/types/contabilidad'
import type { FechaISO } from '@/types'

export interface EntradaRegistroCompra {
  proveedor: Proveedor
  fecha: FechaISO
  vencimiento: FechaISO
  tipoComprobante: string
  numero?: string
  condicionPago: Compra['condicionPago']
  items: ItemCompra[]
}

export interface ResultadoRegistroCompra {
  ok: boolean
  motivo?: 'numero_duplicado' | 'datos_invalidos'
  compra?: Compra
  documento?: DocumentoContable
  asiento?: Asiento
}

export interface EntradaRegistroVenta {
  cliente: Cliente
  fecha: FechaISO
  vencimiento: FechaISO
  tipoComprobante: string
  numero?: string
  condicionVenta: Venta['condicionVenta']
  items: ItemVenta[]
}

export interface ResultadoRegistroVenta {
  ok: boolean
  motivo?: 'numero_duplicado' | 'datos_invalidos'
  venta?: Venta
  documento?: DocumentoContable
  asiento?: Asiento
}

/**
 * Estado central de la demo. Toda la información contable se deriva de los
 * asientos registrados; las operaciones comerciales conservan su documento de
 * origen para la trazabilidad.
 */
export const useContabilidadStore = defineStore('contabilidad', () => {
  const estadoPersistido = cargarEstado()
  const estado = ref<EstadoContable>(estadoPersistido ?? crearEstadoDemo())

  if (!estadoPersistido) {
    guardarEstado(estado.value)
  }

  function persistir(): boolean {
    return guardarEstado(estado.value)
  }

  /* Asientos --------------------------------------------------------------- */
  const asientosRegistrados = computed(() =>
    estado.value.asientos.filter((asiento) => asiento.estado === 'registrado'),
  )
  const asientosPropuestos = computed(() =>
    estado.value.asientos.filter((asiento) => asiento.estado === 'propuesto'),
  )

  const documentosRegistrados = computed(
    () =>
      new Set(
        estado.value.documentos.filter((doc) => doc.estado === 'registrado').map((doc) => doc.id),
      ),
  )

  const documentosPendientes = computed(() =>
    estado.value.documentos.filter((documento) => documento.estado !== 'registrado'),
  )

  /* Libros y estados ------------------------------------------------------- */
  const libroDiario = computed(() =>
    derivarLibroDiario(estado.value.asientos, estado.value.cuentas),
  )

  const libroMayor = computed(() => derivarLibroMayor(libroDiario.value, estado.value.cuentas))

  const balanceComprobacion = computed(() =>
    derivarBalanceComprobacion(libroMayor.value, estado.value.cuentas),
  )

  const estadoResultados = computed(() =>
    derivarEstadoResultados(balanceComprobacion.value, estado.value.cuentas),
  )

  const estadoSituacionPatrimonial = computed(() =>
    derivarEstadoSituacionPatrimonial(
      balanceComprobacion.value,
      estado.value.cuentas,
      estadoResultados.value,
    ),
  )

  /* Tesorería -------------------------------------------------------------- */
  const movimientosTesoreria = computed(() =>
    [...estado.value.movimientos].sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id),
    ),
  )

  const saldosTesoreria = computed(() => derivarSaldosTesoreria(estado.value.movimientos))

  /* Maestros y stock ------------------------------------------------------- */
  const comprasRegistradas = computed(() =>
    estado.value.compras.filter((compra) => documentosRegistrados.value.has(compra.documentoId)),
  )
  const ventasRegistradas = computed(() =>
    estado.value.ventas.filter((venta) => documentosRegistrados.value.has(venta.documentoId)),
  )

  const stockProductos = computed(() =>
    derivarStock(estado.value.productos, comprasRegistradas.value, ventasRegistradas.value),
  )

  const saldosProveedores = computed(() =>
    derivarSaldosProveedores(
      estado.value.proveedores,
      estado.value.compras,
      estado.value.pagos,
      estado.value.documentos,
    ),
  )

  const saldosClientes = computed(() =>
    derivarSaldosClientes(
      estado.value.clientes,
      estado.value.ventas,
      estado.value.cobros,
      estado.value.documentos,
    ),
  )

  /* Acciones --------------------------------------------------------------- */

  function saldoCuenta(codigo: string): number {
    return libroMayor.value[codigo]?.saldoFinal ?? 0
  }

  /**
   * Agrega los movimientos de tesorería que correspondan a un asiento recién
   * registrado, sin duplicar los que ya existan para ese comprobante.
   */
  function asegurarMovimientosTesoreria(asiento: Asiento): void {
    for (const movimiento of derivarMovimientosTesoreria([asiento])) {
      const existe = estado.value.movimientos.some(
        (actual) =>
          actual.asientoId === movimiento.asientoId &&
          actual.cuentaId === movimiento.cuentaId &&
          actual.tipo === movimiento.tipo &&
          actual.importe === movimiento.importe,
      )
      if (!existe) {
        estado.value.movimientos.push(movimiento)
      }
    }
  }

  /**
   * Aprueba y registra el asiento de un documento. Es idempotente: si el
   * documento ya fue registrado, no genera un segundo asiento.
   */
  function aprobarDocumento(documentoId: string): ResultadoAprobacion {
    const documento = estado.value.documentos.find((doc) => doc.id === documentoId)
    if (!documento) {
      return { ok: false, duplicado: false, motivo: 'documento_no_encontrado' }
    }

    const asiento = estado.value.asientos.find(
      (asientoContable) => asientoContable.id === documento.asientoId,
    )
    if (!asiento) {
      return { ok: false, duplicado: false, motivo: 'asiento_no_encontrado' }
    }

    if (documento.estado === 'registrado' || asiento.estado === 'registrado') {
      return {
        ok: true,
        duplicado: true,
        asientoId: asiento.id,
        numero: asiento.numero,
      }
    }

    if (documento.estado === 'observado') {
      return { ok: false, duplicado: false, motivo: 'documento_observado' }
    }

    if (!asientoBalanceado(asiento)) {
      return { ok: false, duplicado: false, motivo: 'asiento_desbalanceado' }
    }

    const registracionPrevia = estado.value.asientos.some(
      (asientoContable) =>
        asientoContable.id !== asiento.id &&
        asientoContable.estado === 'registrado' &&
        asientoContable.origen === asiento.origen &&
        asientoContable.origenId === asiento.origenId,
    )

    if (registracionPrevia) {
      return { ok: true, duplicado: true, asientoId: asiento.id, numero: null }
    }

    asiento.estado = 'registrado'
    asiento.numero = siguienteNumeroAsiento(estado.value.asientos)
    asiento.fechaRegistro = asiento.fecha
    documento.estado = 'registrado'

    asegurarMovimientosTesoreria(asiento)
    persistir()

    return {
      ok: true,
      duplicado: false,
      asientoId: asiento.id,
      numero: asiento.numero,
    }
  }

  /**
   * Registra una compra completa, su factura recibida y el asiento propuesto.
   * El documento queda pendiente en la bandeja de Contaduría hasta que se
   * apruebe desde ese módulo.
   */
  function registrarCompra(datos: EntradaRegistroCompra): ResultadoRegistroCompra {
    const numero =
      datos.numero?.trim() ||
      siguienteNumeroComprobanteCompra(estado.value.compras, datos.tipoComprobante)

    if (estado.value.compras.some((compra) => compra.numero === numero)) {
      return { ok: false, motivo: 'numero_duplicado' }
    }

    const id = siguienteIdCompra(estado.value.compras)
    const datosCompletos: DatosNuevaCompra = {
      proveedor: datos.proveedor,
      fecha: datos.fecha,
      vencimiento: datos.vencimiento,
      tipoComprobante: datos.tipoComprobante,
      numero,
      condicionPago: datos.condicionPago,
      items: datos.items,
    }

    try {
      const generada = generarCompra(datosCompletos, id)
      estado.value.compras.push(generada.compra)
      estado.value.asientos.push(generada.asiento)
      estado.value.documentos.push(generada.documento)
      persistir()

      return {
        ok: true,
        compra: generada.compra,
        documento: generada.documento,
        asiento: generada.asiento,
      }
    } catch {
      return { ok: false, motivo: 'datos_invalidos' }
    }
  }

  /**
   * Registra una venta completa, su factura emitida y el asiento propuesto.
   * El documento queda pendiente en la bandeja de Contaduría hasta que se
   * apruebe desde ese módulo.
   */
  function registrarVenta(datos: EntradaRegistroVenta): ResultadoRegistroVenta {
    const numero =
      datos.numero?.trim() ||
      siguienteNumeroComprobanteVenta(estado.value.ventas, datos.tipoComprobante)

    if (estado.value.ventas.some((venta) => venta.numero === numero)) {
      return { ok: false, motivo: 'numero_duplicado' }
    }

    const id = siguienteIdVenta(estado.value.ventas)
    const datosCompletos: DatosNuevaVenta = {
      cliente: datos.cliente,
      fecha: datos.fecha,
      vencimiento: datos.vencimiento,
      tipoComprobante: datos.tipoComprobante,
      numero,
      condicionVenta: datos.condicionVenta,
      items: datos.items,
    }

    try {
      const generada = generarVenta(datosCompletos, id)
      estado.value.ventas.push(generada.venta)
      estado.value.asientos.push(generada.asiento)
      estado.value.documentos.push(generada.documento)
      persistir()

      return {
        ok: true,
        venta: generada.venta,
        documento: generada.documento,
        asiento: generada.asiento,
      }
    } catch {
      return { ok: false, motivo: 'datos_invalidos' }
    }
  }

  /** Actualiza los datos institucionales de la empresa y los persiste. */
  function actualizarEmpresa(cambios: Partial<DatosEmpresa>): void {
    estado.value.empresa = { ...estado.value.empresa, ...cambios }
    persistir()
  }

  /* Maestros --------------------------------------------------------------- */

  interface ResultadoCrudMaestro {
    ok: boolean
    motivo?: 'datos_invalidos' | 'duplicado' | 'en_uso' | 'no_encontrado'
    proveedor?: Proveedor
    cliente?: Cliente
    producto?: Producto
  }

  function normalizarProveedorEntrada(
    entrada: Proveedor | Omit<Proveedor, 'id'> | Partial<Proveedor>,
    id?: string,
  ): Proveedor {
    const base: Proveedor = {
      id:
        id ??
        (typeof (entrada as { id?: unknown }).id === 'string'
          ? ((entrada as { id?: unknown }).id as string)
          : ''),
      nombre: entrada.nombre ?? '',
      cuit: entrada.cuit ?? '',
      email: entrada.email ?? '',
      telefono: entrada.telefono ?? '',
      direccion: entrada.direccion ?? '',
      condicionIva: (entrada.condicionIva as Proveedor['condicionIva']) ?? 'Responsable Inscripto',
    }
    if (!base.id) base.id = siguienteIdProveedorLocal()
    return base
  }

  function siguienteIdProveedorLocal(): string {
    const maximo = estado.value.proveedores.reduce((max, proveedor) => {
      const coincidencia = /^PRV-(\d+)$/.exec(proveedor.id)
      if (!coincidencia) return max
      return Math.max(max, Number.parseInt(coincidencia[1] ?? '0', 10))
    }, 0)
    return `PRV-${String(maximo + 1).padStart(2, '0')}`
  }

  function siguienteIdClienteLocal(): string {
    const maximo = estado.value.clientes.reduce((max, cliente) => {
      const coincidencia = /^CLI-(\d+)$/.exec(cliente.id)
      if (!coincidencia) return max
      return Math.max(max, Number.parseInt(coincidencia[1] ?? '0', 10))
    }, 0)
    return `CLI-${String(maximo + 1).padStart(2, '0')}`
  }

  function siguienteIdProductoLocal(): string {
    const maximo = estado.value.productos.reduce((max, producto) => {
      const coincidencia = /^(PROD|SERV)-(\d+)$/.exec(producto.id)
      if (!coincidencia) return max
      return Math.max(max, Number.parseInt(coincidencia[2] ?? '0', 10))
    }, 0)
    return `PROD-${String(maximo + 1).padStart(2, '0')}`
  }

  function registrarProveedor(
    entrada: Proveedor | Omit<Proveedor, 'id'> | Partial<Proveedor>,
    id?: string,
  ): ResultadoCrudMaestro {
    const proveedor = normalizarProveedorEntrada(entrada, id)
    if (!proveedor.id) proveedor.id = siguienteIdProveedorLocal()

    // validación básica
    if (!proveedor.nombre.trim()) {
      return { ok: false, motivo: 'datos_invalidos' }
    }
    if (estado.value.proveedores.some((p) => p.id === proveedor.id)) {
      return { ok: false, motivo: 'duplicado' }
    }
    if (estado.value.proveedores.some((p) => p.cuit === proveedor.cuit && proveedor.cuit)) {
      return { ok: false, motivo: 'duplicado' }
    }

    estado.value.proveedores.push(proveedor)
    persistir()
    return { ok: true, proveedor }
  }

  function actualizarProveedor(
    idOCambios: string | Proveedor | Partial<Proveedor>,
    cambios?: Partial<Proveedor>,
  ): ResultadoCrudMaestro {
    let id = ''
    let patch: Partial<Proveedor> = {}
    if (typeof idOCambios === 'string') {
      id = idOCambios
      patch = cambios ?? {}
    } else if (idOCambios && typeof idOCambios === 'object') {
      if (typeof (idOCambios as Proveedor).id === 'string') {
        id = (idOCambios as Proveedor).id
      }
      patch = idOCambios as Partial<Proveedor>
    }
    if (!id) return { ok: false, motivo: 'no_encontrado' }

    const indice = estado.value.proveedores.findIndex((proveedor) => proveedor.id === id)
    if (indice === -1) return { ok: false, motivo: 'no_encontrado' }

    estado.value.proveedores[indice] = {
      ...estado.value.proveedores[indice],
      ...patch,
      id,
    }
    persistir()
    return { ok: true, proveedor: estado.value.proveedores[indice] }
  }

  function eliminarProveedor(id: string): ResultadoCrudMaestro {
    const usado =
      estado.value.compras.some((compra) => compra.proveedorId === id) ||
      estado.value.pagos.some((pago) => pago.proveedorId === id)
    if (usado) return { ok: false, motivo: 'en_uso' }

    const indice = estado.value.proveedores.findIndex((proveedor) => proveedor.id === id)
    if (indice === -1) return { ok: false, motivo: 'no_encontrado' }

    estado.value.proveedores.splice(indice, 1)
    persistir()
    return { ok: true }
  }

  function normalizarClienteEntrada(
    entrada: Cliente | Omit<Cliente, 'id'> | Partial<Cliente>,
    id?: string,
  ): Cliente {
    const base: Cliente = {
      id:
        id ??
        (typeof (entrada as { id?: unknown }).id === 'string'
          ? ((entrada as { id?: unknown }).id as string)
          : ''),
      nombre: entrada.nombre ?? '',
      cuit: entrada.cuit ?? '',
      email: entrada.email ?? '',
      telefono: entrada.telefono ?? '',
      direccion: entrada.direccion ?? '',
      condicionIva: (entrada.condicionIva as Cliente['condicionIva']) ?? 'Responsable Inscripto',
    }
    if (!base.id) base.id = siguienteIdClienteLocal()
    return base
  }

  function registrarCliente(
    entrada: Cliente | Omit<Cliente, 'id'> | Partial<Cliente>,
    id?: string,
  ): ResultadoCrudMaestro {
    const cliente = normalizarClienteEntrada(entrada, id)
    if (!cliente.id) cliente.id = siguienteIdClienteLocal()

    if (!cliente.nombre.trim()) return { ok: false, motivo: 'datos_invalidos' }
    if (estado.value.clientes.some((c) => c.id === cliente.id))
      return { ok: false, motivo: 'duplicado' }
    if (estado.value.clientes.some((c) => c.cuit === cliente.cuit && cliente.cuit)) {
      return { ok: false, motivo: 'duplicado' }
    }

    estado.value.clientes.push(cliente)
    persistir()
    return { ok: true, cliente }
  }

  function actualizarCliente(
    idOCambios: string | Cliente | Partial<Cliente>,
    cambios?: Partial<Cliente>,
  ): ResultadoCrudMaestro {
    let id = ''
    let patch: Partial<Cliente> = {}
    if (typeof idOCambios === 'string') {
      id = idOCambios
      patch = cambios ?? {}
    } else if (idOCambios && typeof idOCambios === 'object') {
      if (typeof (idOCambios as Cliente).id === 'string') {
        id = (idOCambios as Cliente).id
      }
      patch = idOCambios as Partial<Cliente>
    }
    if (!id) return { ok: false, motivo: 'no_encontrado' }

    const indice = estado.value.clientes.findIndex((cliente) => cliente.id === id)
    if (indice === -1) return { ok: false, motivo: 'no_encontrado' }

    estado.value.clientes[indice] = {
      ...estado.value.clientes[indice],
      ...patch,
      id,
    }
    persistir()
    return { ok: true, cliente: estado.value.clientes[indice] }
  }

  function eliminarCliente(id: string): ResultadoCrudMaestro {
    const usado =
      estado.value.ventas.some((venta) => venta.clienteId === id) ||
      estado.value.cobros.some((cobro) => cobro.clienteId === id)
    if (usado) return { ok: false, motivo: 'en_uso' }

    const indice = estado.value.clientes.findIndex((cliente) => cliente.id === id)
    if (indice === -1) return { ok: false, motivo: 'no_encontrado' }

    estado.value.clientes.splice(indice, 1)
    persistir()
    return { ok: true }
  }

  function normalizarProductoEntrada(
    entrada: Producto | Omit<Producto, 'id'> | Partial<Producto>,
    id?: string,
  ): Producto {
    const base: Producto = {
      id:
        id ??
        (typeof (entrada as { id?: unknown }).id === 'string'
          ? ((entrada as { id?: unknown }).id as string)
          : ''),
      codigo: entrada.codigo ?? '',
      nombre: entrada.nombre ?? '',
      tipo: (entrada.tipo as Producto['tipo']) ?? 'producto',
      precioVenta: entrada.precioVenta ?? 0,
      costo: entrada.costo ?? 0,
      alicuotaIva: entrada.alicuotaIva ?? 21,
      stockInicial: entrada.stockInicial ?? 0,
      puntoReposicion: entrada.puntoReposicion ?? 0,
      cuentaCompra: entrada.cuentaCompra ?? CODIGOS.MERCADERIAS,
      cuentaIngreso: entrada.cuentaIngreso ?? CODIGOS.VENTAS,
      cuentaCosto: entrada.cuentaCosto ?? CODIGOS.CMV,
    }
    if (!base.id) base.id = siguienteIdProductoLocal()
    return base
  }

  function registrarProducto(
    entrada: Producto | Omit<Producto, 'id'> | Partial<Producto>,
    id?: string,
  ): ResultadoCrudMaestro {
    const producto = normalizarProductoEntrada(entrada, id)
    if (!producto.id) producto.id = siguienteIdProductoLocal()

    if (!producto.codigo.trim() || !producto.nombre.trim()) {
      return { ok: false, motivo: 'datos_invalidos' }
    }
    if (estado.value.productos.some((p) => p.id === producto.id)) {
      return { ok: false, motivo: 'duplicado' }
    }
    if (estado.value.productos.some((p) => p.codigo === producto.codigo)) {
      return { ok: false, motivo: 'duplicado' }
    }

    estado.value.productos.push(producto)
    persistir()
    return { ok: true, producto }
  }

  function actualizarProducto(
    idOCambios: string | Producto | Partial<Producto>,
    cambios?: Partial<Producto>,
  ): ResultadoCrudMaestro {
    let id = ''
    let patch: Partial<Producto> = {}
    if (typeof idOCambios === 'string') {
      id = idOCambios
      patch = cambios ?? {}
    } else if (idOCambios && typeof idOCambios === 'object') {
      if (typeof (idOCambios as Producto).id === 'string') {
        id = (idOCambios as Producto).id
      }
      patch = idOCambios as Partial<Producto>
    }
    if (!id) return { ok: false, motivo: 'no_encontrado' }

    const indice = estado.value.productos.findIndex((producto) => producto.id === id)
    if (indice === -1) return { ok: false, motivo: 'no_encontrado' }

    estado.value.productos[indice] = {
      ...estado.value.productos[indice],
      ...patch,
      id,
    }
    persistir()
    return { ok: true, producto: estado.value.productos[indice] }
  }

  function eliminarProducto(id: string): ResultadoCrudMaestro {
    const usado =
      estado.value.compras.some((compra) => compra.items.some((item) => item.productoId === id)) ||
      estado.value.ventas.some((venta) => venta.items.some((item) => item.productoId === id))
    if (usado) return { ok: false, motivo: 'en_uso' }

    const indice = estado.value.productos.findIndex((producto) => producto.id === id)
    if (indice === -1) return { ok: false, motivo: 'no_encontrado' }

    estado.value.productos.splice(indice, 1)
    persistir()
    return { ok: true }
  }

  // aliases for compatibility
  const crearProveedor = registrarProveedor
  const editarProveedor = actualizarProveedor
  const borrarProveedor = eliminarProveedor
  const agregarProveedor = registrarProveedor
  const guardarProveedor = actualizarProveedor

  const crearCliente = registrarCliente
  const editarCliente = actualizarCliente
  const borrarCliente = eliminarCliente
  const agregarCliente = registrarCliente
  const guardarCliente = actualizarCliente

  const crearProducto = registrarProducto
  const editarProducto = actualizarProducto
  const borrarProducto = eliminarProducto
  const agregarProducto = registrarProducto
  const guardarProducto = actualizarProducto

  /** Reemplaza el estado actual por los datos demo originales. */
  function restaurarDemo(): void {
    estado.value = restaurarEstadoDemo()
  }

  /** Vuelve al estado en memoria sin tocar la persistencia. Útil para pruebas. */
  function reiniciarEnMemoria(): void {
    estado.value = crearEstadoDemo()
  }

  return {
    estado,
    asientosRegistrados,
    asientosPropuestos,
    documentosPendientes,
    libroDiario,
    libroMayor,
    balanceComprobacion,
    estadoResultados,
    estadoSituacionPatrimonial,
    movimientosTesoreria,
    saldosTesoreria,
    comprasRegistradas,
    ventasRegistradas,
    stockProductos,
    saldosProveedores,
    saldosClientes,
    saldoCuenta,
    aprobarDocumento,
    registrarCompra,
    registrarVenta,
    actualizarEmpresa,
    restaurarDemo,
    reiniciarEnMemoria,
    persistir,
    registrarProveedor,
    actualizarProveedor,
    eliminarProveedor,
    crearProveedor,
    editarProveedor,
    borrarProveedor,
    agregarProveedor,
    guardarProveedor,
    registrarCliente,
    actualizarCliente,
    eliminarCliente,
    crearCliente,
    editarCliente,
    borrarCliente,
    agregarCliente,
    guardarCliente,
    registrarProducto,
    actualizarProducto,
    eliminarProducto,
    crearProducto,
    editarProducto,
    borrarProducto,
    agregarProducto,
    guardarProducto,
  }
})
