<script setup lang="ts">
import {
  ArrowLeft,
  Eye,
  FileText,
  FilterX,
  Plus,
  Printer,
  Send,
  ShoppingCart,
  Trash2,
  Wallet,
} from '@lucide/vue'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import CurrencyInput from '@/components/ui/CurrencyInput.vue'
import DataTable from '@/components/ui/DataTable.vue'
import DocumentViewer from '@/components/ui/DocumentViewer.vue'
import TraceTimeline from '@/components/ui/TraceTimeline.vue'
import type {
  ColumnaTabla,
  DocumentoVista,
  OpcionSelect,
  PasoTimeline,
  TabItem,
  TipoBadge,
} from '@/components/ui/tipos'
import {
  ALICUOTAS_IVA_VENTA,
  TIPOS_COMPROBANTE_VENTA,
  agruparCuentasPorCobrar,
  calcularVencimiento,
  estadoContableVenta,
  etiquetaEstadoContable,
  etiquetaEstadoCobro,
  filtrarVentas,
  filtrosVentaVacios,
  hayErroresVenta,
  resumirVentas,
  siguienteNumeroComprobanteVenta,
  validarVenta,
  type ErroresItemVenta,
  type FiltrosVenta,
} from '@/core/ventas'
import { estadoCobroVenta, saldoPendienteVenta } from '@/core/contabilidad'
import { calcularTotales, formatearFecha, formatearMoneda } from '@/core/dinero'
import { CODIGOS } from '@/data/plan-cuentas'
import { useContabilidadStore } from '@/stores/contabilidad'
import { useUiStore } from '@/stores/ui'
import type { FechaISO } from '@/types'
import type { Venta, ItemVenta } from '@/types/contabilidad'

/* -------------------------------------------------------------------------- */
/* Estado de la pantalla                                                      */
/* -------------------------------------------------------------------------- */

type VistaVentas = 'listado' | 'cuentas-por-cobrar' | 'nueva'

interface ItemFormulario {
  clave: number
  productoId: string
  descripcion: string
  cantidad: string
  precioUnitario: number
  costoUnitario: number
  alicuotaIva: string
}

const contabilidad = useContabilidadStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const empresa = computed(() => contabilidad.estado.empresa)
const periodo = computed(() => contabilidad.estado.periodo)

const vista = computed<VistaVentas>(() => {
  if (route.query.vista === 'nueva') return 'nueva'
  if (route.query.vista === 'cuentas-por-cobrar') return 'cuentas-por-cobrar'
  return 'listado'
})

const tabsListado = computed<TabItem[]>(() => [
  {
    id: 'listado',
    etiqueta: 'Comprobantes recibidos',
    badge: contabilidad.estado.ventas.length,
  },
  {
    id: 'cuentas-por-cobrar',
    etiqueta: 'Cuentas por cobrar',
    badge: cuentasPorCobrar.value.length,
  },
])

const tabActiva = computed(() =>
  vista.value === 'cuentas-por-cobrar' ? 'cuentas-por-cobrar' : 'listado',
)

function cambiarTab(id: string): void {
  void router.push({
    name: 'ventas',
    query: id === 'cuentas-por-cobrar' ? { vista: 'cuentas-por-cobrar' } : {},
  })
}

function abrirFormulario(): void {
  reiniciarFormulario()
  void router.push({ name: 'ventas', query: { vista: 'nueva' } })
}

function volverListado(): void {
  void router.push({ name: 'ventas' })
}

/* -------------------------------------------------------------------------- */
/* Listado, filtros y resumen                                                 */
/* -------------------------------------------------------------------------- */

const filtros = reactive<FiltrosVenta>(filtrosVentaVacios())
const pagina = ref(1)
const tamanoPagina = 8

const ventasFiltradas = computed(() =>
  filtrarVentas(
    contabilidad.estado.ventas,
    contabilidad.estado.clientes,
    contabilidad.estado.cobros,
    contabilidad.estado.documentos,
    filtros,
  ),
)

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(ventasFiltradas.value.length / tamanoPagina)),
)

const ventasPagina = computed(() => {
  const inicio = (pagina.value - 1) * tamanoPagina
  return ventasFiltradas.value.slice(inicio, inicio + tamanoPagina)
})

watch(
  () => [filtros.texto, filtros.desde, filtros.hasta, filtros.estadoCobro, filtros.estadoContable],
  () => {
    pagina.value = 1
  },
)

watch(totalPaginas, (total) => {
  if (pagina.value > total) pagina.value = total
})

const resumen = computed(() =>
  resumirVentas(
    contabilidad.estado.ventas,
    contabilidad.estado.cobros,
    contabilidad.estado.documentos,
  ),
)

const clientesPorId = computed(
  () => new Map(contabilidad.estado.clientes.map((cliente) => [cliente.id, cliente])),
)
const documentosPorId = computed(
  () => new Map(contabilidad.estado.documentos.map((documento) => [documento.id, documento])),
)

const filasVentas = computed<Record<string, unknown>[]>(() =>
  ventasPagina.value.map((venta) => {
    const cliente = clientesPorId.value.get(venta.clienteId)
    const documento = documentosPorId.value.get(venta.documentoId)
    const estadoCobro = estadoCobroVenta(venta, contabilidad.estado.cobros)
    const estadoContable = documento?.estado ?? 'pendiente'
    const saldo = saldoPendienteVenta(venta, contabilidad.estado.cobros)

    return {
      id: venta.id,
      fecha: formatearFecha(venta.fecha),
      numero: venta.numero,
      tipoComprobante: venta.tipoComprobante,
      cliente: cliente?.nombre ?? 'Cliente',
      cuit: cliente?.cuit ?? '—',
      condicion: venta.condicionVenta === 'contado' ? 'Contado' : 'Cuenta corriente',
      total: venta.total,
      totalTexto: formatearMoneda(venta.total),
      ivaTexto: formatearMoneda(venta.iva),
      estadoCobro,
      estadoCobroTexto: etiquetaEstadoCobro(estadoCobro),
      estadoContable,
      estadoContableTexto: etiquetaEstadoContable(estadoContable),
      saldo,
      saldoTexto: formatearMoneda(saldo),
    }
  }),
)

const columnasVentas: readonly ColumnaTabla[] = [
  { clave: 'fecha', titulo: 'Fecha', ancho: '92px' },
  { clave: 'comprobante', titulo: 'Comprobante' },
  { clave: 'cliente', titulo: 'Cliente' },
  { clave: 'condicion', titulo: 'Condición', ancho: '124px' },
  { clave: 'total', titulo: 'Total', alineacion: 'derecha' },
  { clave: 'estadoCobro', titulo: 'Cobro', alineacion: 'centro' },
  { clave: 'estadoContable', titulo: 'Contable', alineacion: 'centro' },
  { clave: 'acciones', titulo: '', alineacion: 'derecha', ancho: '72px' },
]

const opcionesEstadoCobro: readonly OpcionSelect[] = [
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'parcial', etiqueta: 'Parcial' },
  { valor: 'cobrada', etiqueta: 'Cobrada' },
]

const opcionesEstadoContable: readonly OpcionSelect[] = [
  { valor: 'pendiente', etiqueta: 'Pendiente de revisión' },
  { valor: 'en_revision', etiqueta: 'En revisión' },
  { valor: 'aprobado', etiqueta: 'Aprobado' },
  { valor: 'registrado', etiqueta: 'Registrado' },
  { valor: 'observado', etiqueta: 'Observado' },
]

function cambiarFiltroEstadoCobro(valor: string): void {
  filtros.estadoCobro = valor as FiltrosVenta['estadoCobro']
}

function cambiarFiltroEstadoContable(valor: string): void {
  filtros.estadoContable = valor as FiltrosVenta['estadoContable']
}

function limpiarFiltros(): void {
  Object.assign(filtros, filtrosVentaVacios())
  pagina.value = 1
}

function irAPagina(nueva: number): void {
  pagina.value = nueva
}

function tipoBadgeEstadoCobro(estado: unknown): TipoBadge {
  switch (estado) {
    case 'cobrada':
      return 'exito'
    case 'parcial':
      return 'advertencia'
    case 'pendiente':
      return 'info'
    default:
      return 'neutral'
  }
}

function tipoBadgeEstadoContable(estado: unknown): TipoBadge {
  switch (estado) {
    case 'registrado':
      return 'exito'
    case 'aprobado':
      return 'marca'
    case 'en_revision':
      return 'advertencia'
    case 'observado':
      return 'error'
    case 'pendiente':
      return 'info'
    default:
      return 'neutral'
  }
}

/* -------------------------------------------------------------------------- */
/* Cuentas por cobrar                                                          */
/* -------------------------------------------------------------------------- */

const cuentasPorCobrar = computed(() =>
  agruparCuentasPorCobrar(
    contabilidad.estado.ventas,
    contabilidad.estado.clientes,
    contabilidad.estado.cobros,
    contabilidad.estado.documentos,
  ),
)

const totalCuentasPorCobrar = computed(() =>
  cuentasPorCobrar.value.reduce((total, cuenta) => total + cuenta.saldo, 0),
)

const filasCuentasPorCobrar = computed<Record<string, unknown>[]>(() =>
  cuentasPorCobrar.value.map((cuenta) => ({
    id: cuenta.clienteId,
    cliente: cuenta.cliente,
    cuit: cuenta.cuit,
    comprobantes: cuenta.comprobantes,
    vencimiento: cuenta.vencimiento,
    vencimientoTexto: cuenta.vencimiento ? formatearFecha(cuenta.vencimiento) : '—',
    saldo: cuenta.saldo,
    saldoTexto: formatearMoneda(cuenta.saldo),
  })),
)

const columnasCuentasPorCobrar: readonly ColumnaTabla[] = [
  { clave: 'cliente', titulo: 'Cliente' },
  { clave: 'comprobantes', titulo: 'Comprobantes', alineacion: 'centro' },
  { clave: 'vencimiento', titulo: 'Próximo vencimiento' },
  { clave: 'saldo', titulo: 'Saldo pendiente', alineacion: 'derecha' },
  { clave: 'acciones', titulo: '', alineacion: 'derecha', ancho: '96px' },
]

function verVentasCliente(cliente: string): void {
  filtros.texto = cliente
  pagina.value = 1
  void router.push({ name: 'ventas' })
}

/* -------------------------------------------------------------------------- */
/* Detalle y factura recibida                                                 */
/* -------------------------------------------------------------------------- */

const ventaDetalleId = ref<string | null>(null)
const tabDetalle = ref('resumen')

const ventaDetalle = computed(
  () => contabilidad.estado.ventas.find((venta) => venta.id === ventaDetalleId.value) ?? null,
)

const clienteDetalle = computed(() =>
  ventaDetalle.value
    ? contabilidad.estado.clientes.find((cliente) => cliente.id === ventaDetalle.value?.clienteId)
    : undefined,
)

const documentoDetalle = computed(() =>
  ventaDetalle.value
    ? contabilidad.estado.documentos.find(
        (documento) => documento.id === ventaDetalle.value?.documentoId,
      )
    : undefined,
)

const asientoDetalle = computed(() =>
  ventaDetalle.value
    ? contabilidad.estado.asientos.find((asiento) => asiento.id === ventaDetalle.value?.asientoId)
    : undefined,
)

const cobrosDetalle = computed(() =>
  ventaDetalle.value
    ? contabilidad.estado.cobros.filter((pago) => pago.ventaId === ventaDetalle.value?.id)
    : [],
)

const estadoCobroDetalle = computed(() =>
  ventaDetalle.value
    ? estadoCobroVenta(ventaDetalle.value, contabilidad.estado.cobros)
    : 'pendiente',
)

const estadoContableDetalle = computed(() =>
  ventaDetalle.value
    ? estadoContableVenta(ventaDetalle.value, contabilidad.estado.documentos)
    : 'pendiente',
)

const saldoDetalle = computed(() =>
  ventaDetalle.value ? saldoPendienteVenta(ventaDetalle.value, contabilidad.estado.cobros) : 0,
)

const tabsDetalle: readonly TabItem[] = [
  { id: 'resumen', etiqueta: 'Resumen' },
  { id: 'factura', etiqueta: 'Factura emitida' },
  { id: 'trazabilidad', etiqueta: 'Trazabilidad' },
]

const facturaDetalle = computed<DocumentoVista | null>(() => {
  const venta = ventaDetalle.value
  const cliente = clienteDetalle.value
  if (!venta || !cliente) return null

  const condicion = venta.condicionVenta === 'contado' ? 'Contado' : 'Cuenta corriente'

  return {
    tipoEtiqueta: venta.tipoComprobante,
    numero: venta.numero,
    fecha: venta.fecha,
    estadoEtiqueta: `Estado contable: ${etiquetaEstadoContable(estadoContableDetalle.value)}`,
    emisor: {
      nombre: empresa.value.razonSocial,
      cuit: empresa.value.cuit,
      direccion: empresa.value.direccion,
      condicionIva: 'Responsable Inscripto',
      logoSrc: empresa.value.logoDataUrl,
    },
    receptor: {
      nombre: cliente.nombre,
      cuit: cliente.cuit,
      direccion: cliente.direccion,
      condicionIva: cliente.condicionIva,
    },
    items: venta.items.map((item) => ({
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      alicuotaIva: item.alicuotaIva,
    })),
    subtotal: venta.subtotal,
    iva: venta.iva,
    total: venta.total,
    observaciones: `Venta registrada en Enigma Gestión. Condición de venta: ${condicion}. Vencimiento: ${formatearFecha(venta.vencimiento)}. Documento simulado para la demostración.`,
  }
})

const pasosDetalle = computed<PasoTimeline[]>(() => {
  const venta = ventaDetalle.value
  if (!venta) return []

  const registrado = estadoContableDetalle.value === 'registrado'
  const estadoCobro = estadoCobroDetalle.value

  return [
    {
      titulo: 'Venta registrada',
      fecha: formatearFecha(venta.fecha),
      descripcion: `Alta de la operación ${venta.numero}.`,
      estado: 'completado',
    },
    {
      titulo: 'Factura emitida generada',
      fecha: formatearFecha(venta.fecha),
      descripcion: 'Se generó el comprobante simulado y el asiento propuesto.',
      estado: 'completado',
    },
    {
      titulo: 'Enviada a la bandeja de Contaduría',
      descripcion: registrado
        ? 'La documentación fue revisada y registrada.'
        : 'La operación espera revisión y aprobación contable.',
      estado: registrado ? 'completado' : 'actual',
      to: '/contaduria?vista=bandeja',
    },
    {
      titulo: 'Registración en el Libro Diario',
      descripcion: registrado
        ? `Asiento N.º ${asientoDetalle.value?.numero ?? '—'} registrado.`
        : 'El asiento se registrará al aprobar la operación.',
      estado: registrado ? 'completado' : 'pendiente',
      to: '/libros?vista=diario',
    },
    {
      titulo: 'Cobro al cliente',
      descripcion:
        estadoCobro === 'cobrada'
          ? 'La obligación se encuentra cancelada.'
          : estadoCobro === 'parcial'
            ? `Cobro parcial registrado. Saldo: ${formatearMoneda(saldoDetalle.value)}.`
            : `Saldo pendiente: ${formatearMoneda(saldoDetalle.value)}.`,
      estado:
        estadoCobro === 'cobrada'
          ? 'completado'
          : estadoCobro === 'parcial'
            ? 'actual'
            : 'pendiente',
      to: '/tesoreria?vista=cobros',
    },
  ]
})

watch(
  () => route.query.operacion,
  (valor) => {
    if (
      typeof valor === 'string' &&
      contabilidad.estado.ventas.some((venta) => venta.id === valor)
    ) {
      ventaDetalleId.value = valor
    } else if (typeof valor !== 'string') {
      ventaDetalleId.value = null
    }
  },
  { immediate: true },
)

watch(
  () => route.query.tab,
  (valor) => {
    if (typeof valor === 'string' && ['resumen', 'factura', 'trazabilidad'].includes(valor)) {
      tabDetalle.value = valor
    }
  },
  { immediate: true },
)

watch(tabDetalle, (valor) => {
  const venta = ventaDetalle.value
  if (!venta) return
  if (route.query.tab === valor) return
  void router.replace({
    name: 'ventas',
    query: { ...route.query, operacion: venta.id, tab: valor },
  })
})

function abrirDetalle(id: string): void {
  ventaDetalleId.value = id
  tabDetalle.value = 'resumen'
  void router.replace({ name: 'ventas', query: { ...route.query, operacion: id, tab: 'resumen' } })
}

function cerrarDetalle(): void {
  ventaDetalleId.value = null
  if (route.query.operacion || route.query.tab) {
    const query = { ...route.query }
    delete query.operacion
    delete query.tab
    void router.replace({ name: 'ventas', query })
  }
}

function alCambiarDetalle(abierto: boolean): void {
  if (!abierto) cerrarDetalle()
}

async function imprimirFactura(): Promise<void> {
  tabDetalle.value = 'factura'
  await nextTick()

  if (typeof window.print !== 'function') return

  document.body.classList.add('imprimiendo-factura')
  const limpiar = (): void => {
    document.body.classList.remove('imprimiendo-factura')
    window.removeEventListener('afterprint', limpiar)
  }
  window.addEventListener('afterprint', limpiar)
  window.print()
}

/* -------------------------------------------------------------------------- */
/* Formulario de alta                                                         */
/* -------------------------------------------------------------------------- */

let siguienteClaveItem = 1

function crearItemFormulario(): ItemFormulario {
  return {
    clave: siguienteClaveItem++,
    productoId: '',
    descripcion: '',
    cantidad: '1',
    precioUnitario: 0,
    costoUnitario: 0,
    alicuotaIva: '21',
  }
}

function fechaInicial(): string {
  const hoy = new Date().toISOString().slice(0, 10)
  const { desde, hasta } = contabilidad.estado.periodo
  if (hoy < desde) return desde
  if (hoy > hasta) return hasta
  return hoy
}

const fechaInicialFormulario = fechaInicial()

const form = reactive<{
  clienteId: string
  fecha: string
  vencimiento: string
  tipoComprobante: string
  condicionVenta: Venta['condicionVenta']
  items: ItemFormulario[]
}>({
  clienteId: '',
  fecha: fechaInicialFormulario,
  vencimiento: calcularVencimiento(fechaInicialFormulario as FechaISO, 'cuenta_corriente'),
  tipoComprobante: 'Factura A',
  condicionVenta: 'cuenta_corriente',
  items: [crearItemFormulario()],
})

const intentoEnvio = ref(false)
const guardando = ref(false)

watch(
  () => [form.fecha, form.condicionVenta],
  () => {
    if (!form.fecha) return
    form.vencimiento = calcularVencimiento(form.fecha as FechaISO, form.condicionVenta)
  },
)

const clienteFormulario = computed(() =>
  contabilidad.estado.clientes.find((cliente) => cliente.id === form.clienteId),
)

const cuitFormulario = computed(() => clienteFormulario.value?.cuit ?? '')

const numeroSugerido = computed(() =>
  siguienteNumeroComprobanteVenta(contabilidad.estado.ventas, form.tipoComprobante),
)

const clientesFormulario = computed<OpcionSelect[]>(() =>
  contabilidad.estado.clientes.map((cliente) => ({
    valor: cliente.id,
    etiqueta: `${cliente.nombre} · ${cliente.cuit}`,
  })),
)

const productosFormulario = computed<OpcionSelect[]>(() =>
  contabilidad.estado.productos.map((producto) => ({
    valor: producto.id,
    etiqueta: `${producto.codigo} · ${producto.nombre}`,
  })),
)

const tiposComprobanteFormulario: readonly OpcionSelect[] = TIPOS_COMPROBANTE_VENTA.map((tipo) => ({
  valor: tipo,
  etiqueta: tipo,
}))

const condicionesCobroFormulario: readonly OpcionSelect[] = [
  { valor: 'cuenta_corriente', etiqueta: 'Cuenta corriente' },
  { valor: 'contado', etiqueta: 'Contado' },
]

const alicuotasFormulario: readonly OpcionSelect[] = ALICUOTAS_IVA_VENTA.map((alicuota) => ({
  valor: String(alicuota),
  etiqueta: `${String(alicuota).replace('.', ',')}%`,
}))

function alSeleccionarProducto(item: ItemFormulario, productoId: string): void {
  item.productoId = productoId
  const producto = contabilidad.estado.productos.find((actual) => actual.id === productoId)
  if (!producto) return

  item.descripcion = producto.nombre
  item.precioUnitario = producto.precioVenta
  item.costoUnitario = producto.costo
  item.alicuotaIva = String(producto.alicuotaIva)
}

function cambiarCondicionVenta(valor: string): void {
  form.condicionVenta = valor === 'contado' ? 'contado' : 'cuenta_corriente'
}

function agregarItem(): void {
  form.items.push(crearItemFormulario())
}

function quitarItem(indice: number): void {
  if (form.items.length <= 1) return
  form.items.splice(indice, 1)
}

function subtotalItem(item: ItemFormulario): number {
  const cantidad = Number(item.cantidad)
  if (!Number.isFinite(cantidad)) return 0
  return cantidad * item.precioUnitario
}

function itemParaVenta(item: ItemFormulario): ItemVenta {
  const producto = contabilidad.estado.productos.find((actual) => actual.id === item.productoId)
  return {
    productoId: item.productoId,
    descripcion: item.descripcion.trim(),
    cantidad: Number(item.cantidad) || 0,
    precioUnitario: item.precioUnitario,
    alicuotaIva: Number(item.alicuotaIva) || 0,
    costoUnitario: item.costoUnitario,
    cuentaIngreso: producto?.cuentaIngreso ?? CODIGOS.VENTAS,
    cuentaCosto: producto?.cuentaCosto ?? CODIGOS.COSTOS,
  }
}

const itemsFormulario = computed<ItemVenta[]>(() => form.items.map(itemParaVenta))

const totalesFormulario = computed(() => calcularTotales(itemsFormulario.value))

const erroresFormulario = computed(() =>
  validarVenta(
    {
      clienteId: form.clienteId,
      fecha: form.fecha,
      vencimiento: form.vencimiento,
      tipoComprobante: form.tipoComprobante,
      numero: numeroSugerido.value,
      condicionVenta: form.condicionVenta,
      items: itemsFormulario.value,
    },
    contabilidad.estado.ventas,
  ),
)

function errorCampo(
  campo:
    | 'clienteId'
    | 'fecha'
    | 'vencimiento'
    | 'tipoComprobante'
    | 'numero'
    | 'condicionVenta'
    | 'items',
): string | undefined {
  return intentoEnvio.value ? erroresFormulario.value[campo] : undefined
}

function errorItem(indice: number, campo: keyof ErroresItemVenta): string | undefined {
  return intentoEnvio.value ? erroresFormulario.value.porItem[indice]?.[campo] : undefined
}

function reiniciarFormulario(): void {
  intentoEnvio.value = false
  const fecha = fechaInicial()
  form.clienteId = ''
  form.fecha = fecha
  form.vencimiento = calcularVencimiento(fecha as FechaISO, 'cuenta_corriente')
  form.tipoComprobante = 'Factura A'
  form.condicionVenta = 'cuenta_corriente'
  form.items = [crearItemFormulario()]
}

async function registrarVenta(): Promise<void> {
  intentoEnvio.value = true
  const errores = erroresFormulario.value

  if (hayErroresVenta(errores)) {
    ui.notificar({
      tipo: 'error',
      titulo: 'Revisá los datos de la venta',
      mensaje: 'Hay campos obligatorios incompletos o importes inválidos.',
    })
    return
  }

  const cliente = clienteFormulario.value
  if (!cliente) return

  guardando.value = true
  const resultado = contabilidad.registrarVenta({
    cliente,
    fecha: form.fecha as FechaISO,
    vencimiento: form.vencimiento as FechaISO,
    tipoComprobante: form.tipoComprobante,
    numero: numeroSugerido.value,
    condicionVenta: form.condicionVenta,
    items: itemsFormulario.value,
  })
  guardando.value = false

  if (!resultado.ok || !resultado.venta) {
    ui.notificar({
      tipo: 'error',
      titulo: 'No se pudo registrar la venta',
      mensaje:
        resultado.motivo === 'numero_duplicado'
          ? 'El número de comprobante ya existe.'
          : 'Revisá los datos ingresados e intentá nuevamente.',
    })
    return
  }

  const venta = resultado.venta
  ui.notificar({
    tipo: 'exito',
    titulo: 'Venta registrada',
    mensaje: `${venta.numero} enviada a la bandeja de Contaduría.`,
  })

  reiniciarFormulario()
  tabDetalle.value = 'factura'
  await router.push({ name: 'ventas', query: { operacion: venta.id } })
}
</script>

<template>
  <section class="page ventas">
    <div class="page__header">
      <div>
        <h2>Ventas</h2>
        <p class="page__lead">
          Administrá las facturas recibidas de {{ empresa.nombreComercial }} durante
          {{ periodo.etiqueta }}. Cada operación genera su comprobante y queda disponible para
          Contaduría.
        </p>
      </div>
      <div class="page__actions">
        <AppBadge tipo="advertencia" punto>
          {{ resumen.pendientesRegistracion }} pendientes de registración
        </AppBadge>
        <AppButton v-if="vista !== 'nueva'" @click="abrirFormulario">
          <Plus :size="16" aria-hidden="true" />
          Nueva venta
        </AppButton>
      </div>
    </div>

    <template v-if="vista === 'nueva'">
      <div class="page__section-header">
        <div>
          <h3>Registrar venta</h3>
          <p>Completá los datos del comprobante recibido y sus productos o servicios.</p>
        </div>
        <AppButton variante="secundario" @click="volverListado">
          <ArrowLeft :size="16" aria-hidden="true" />
          Volver al listado
        </AppButton>
      </div>

      <form class="ventas-formulario" novalidate @submit.prevent="registrarVenta">
        <div class="ventas-formulario__principal">
          <AppCard
            titulo="Datos del comprobante"
            descripcion="El número se genera automáticamente según el tipo elegido."
          >
            <div class="ventas-formulario__campos">
              <AppSelect
                id="venta-cliente"
                v-model="form.clienteId"
                label="Cliente"
                placeholder="Seleccionar cliente"
                :opciones="clientesFormulario"
                :error="errorCampo('clienteId')"
                required
              />
              <AppInput
                id="venta-cuit"
                label="CUIT"
                :model-value="cuitFormulario"
                placeholder="Se completa con el cliente"
                readonly
                hint="Dato fiscal del cliente seleccionado."
              />
              <AppInput
                id="venta-fecha"
                v-model="form.fecha"
                label="Fecha"
                type="date"
                :error="errorCampo('fecha')"
                required
              />
              <AppInput
                id="venta-vencimiento"
                v-model="form.vencimiento"
                label="Vencimiento"
                type="date"
                :error="errorCampo('vencimiento')"
                required
              />
              <AppSelect
                id="venta-tipo"
                v-model="form.tipoComprobante"
                label="Tipo de comprobante"
                :opciones="tiposComprobanteFormulario"
                :error="errorCampo('tipoComprobante')"
                required
              />
              <AppInput
                id="venta-numero"
                label="Número de comprobante"
                :model-value="numeroSugerido"
                readonly
                hint="Numeración automática y correlativa."
                :error="errorCampo('numero')"
              />
              <AppSelect
                id="venta-condicion"
                label="Condición de venta"
                :model-value="form.condicionVenta"
                :opciones="condicionesCobroFormulario"
                :error="errorCampo('condicionVenta')"
                required
                @update:model-value="cambiarCondicionVenta"
              />
            </div>
          </AppCard>

          <AppCard
            titulo="Productos y servicios"
            descripcion="El IVA y el subtotal se calculan automáticamente por ítem."
          >
            <template #acciones>
              <AppButton variante="secundario" tamano="sm" @click="agregarItem">
                <Plus :size="15" aria-hidden="true" />
                Agregar ítem
              </AppButton>
            </template>

            <p v-if="errorCampo('items')" class="ventas-error">
              {{ errorCampo('items') }}
            </p>

            <div class="ventas-items">
              <div v-for="(item, indice) in form.items" :key="item.clave" class="ventas-item">
                <AppSelect
                  :id="`venta-producto-${indice}`"
                  label="Producto o servicio"
                  placeholder="Seleccionar"
                  :model-value="item.productoId"
                  :opciones="productosFormulario"
                  :error="errorItem(indice, 'productoId')"
                  @update:model-value="(valor) => alSeleccionarProducto(item, valor)"
                />
                <AppInput
                  :id="`venta-descripcion-${indice}`"
                  v-model="item.descripcion"
                  label="Descripción"
                  :error="errorItem(indice, 'descripcion')"
                />
                <AppInput
                  :id="`venta-cantidad-${indice}`"
                  v-model="item.cantidad"
                  label="Cantidad"
                  type="number"
                  min="1"
                  step="1"
                  :error="errorItem(indice, 'cantidad')"
                />
                <CurrencyInput
                  :id="`venta-precio-${indice}`"
                  v-model="item.precioUnitario"
                  label="Precio unitario"
                  :error="errorItem(indice, 'precioUnitario')"
                />
                <AppSelect
                  :id="`venta-iva-${indice}`"
                  label="IVA"
                  :model-value="item.alicuotaIva"
                  :opciones="alicuotasFormulario"
                  :error="errorItem(indice, 'alicuotaIva')"
                  @update:model-value="(valor) => (item.alicuotaIva = valor)"
                />
                <div class="ventas-item__subtotal">
                  <span>Subtotal</span>
                  <strong class="texto-mono">{{ formatearMoneda(subtotalItem(item)) }}</strong>
                </div>
                <AppButton
                  variante="fantasma"
                  tamano="sm"
                  solo-icono
                  aria-label="Quitar ítem"
                  :disabled="form.items.length === 1"
                  @click="quitarItem(indice)"
                >
                  <Trash2 :size="16" aria-hidden="true" />
                </AppButton>
              </div>
            </div>
          </AppCard>
        </div>

        <aside class="ventas-formulario__lateral">
          <AppCard titulo="Resumen de la venta" descripcion="Importes calculados al centavo.">
            <div class="ventas-totales">
              <div class="ventas-totales__fila">
                <span>Subtotal</span>
                <strong class="texto-mono">{{
                  formatearMoneda(totalesFormulario.subtotal)
                }}</strong>
              </div>
              <div class="ventas-totales__fila">
                <span>IVA</span>
                <strong class="texto-mono">{{ formatearMoneda(totalesFormulario.iva) }}</strong>
              </div>
              <div class="ventas-totales__fila ventas-totales__fila--total">
                <span>Total</span>
                <strong class="texto-mono">{{ formatearMoneda(totalesFormulario.total) }}</strong>
              </div>
            </div>

            <p class="ventas-aviso">
              <Send :size="15" aria-hidden="true" />
              Al confirmar, la factura recibida y el asiento propuesto se envían a la bandeja de
              Contaduría.
            </p>
          </AppCard>

          <AppCard
            v-if="clienteFormulario"
            titulo="Cliente seleccionado"
            descripcion="Datos fiscales y de contacto."
          >
            <dl class="ventas-datos">
              <div>
                <dt>CUIT</dt>
                <dd>{{ clienteFormulario.cuit }}</dd>
              </div>
              <div>
                <dt>Condición IVA</dt>
                <dd>{{ clienteFormulario.condicionIva }}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{{ clienteFormulario.email }}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{{ clienteFormulario.telefono }}</dd>
              </div>
            </dl>
          </AppCard>

          <div class="ventas-formulario__acciones">
            <AppButton variante="secundario" @click="volverListado">Cancelar</AppButton>
            <AppButton type="submit" :cargando="guardando">
              <FileText :size="16" aria-hidden="true" />
              Registrar venta
            </AppButton>
          </div>
        </aside>
      </form>
    </template>

    <template v-else>
      <div class="ventas-resumen">
        <article class="ventas-resumen__item">
          <span class="ventas-resumen__icono" aria-hidden="true"><ShoppingCart :size="17" /></span>
          <span>Comprobantes</span>
          <strong>{{ resumen.cantidad }}</strong>
          <small>{{ resumen.pendientesRegistracion }} sin registrar</small>
        </article>
        <article class="ventas-resumen__item">
          <span class="ventas-resumen__icono" aria-hidden="true"><FileText :size="17" /></span>
          <span>Total ventas</span>
          <strong class="texto-mono">{{ formatearMoneda(resumen.total) }}</strong>
          <small>IVA débito {{ formatearMoneda(resumen.iva) }}</small>
        </article>
        <article class="ventas-resumen__item">
          <span class="ventas-resumen__icono" aria-hidden="true"><Wallet :size="17" /></span>
          <span>Saldo pendiente</span>
          <strong class="texto-mono">{{ formatearMoneda(resumen.saldoPendiente) }}</strong>
          <small>Obligaciones con clientes</small>
        </article>
        <article class="ventas-resumen__item">
          <span class="ventas-resumen__icono" aria-hidden="true"><Send :size="17" /></span>
          <span>En bandeja</span>
          <strong>{{ resumen.pendientesRegistracion }}</strong>
          <small>Pendientes de Contaduría</small>
        </article>
      </div>

      <AppTabs :tabs="tabsListado" :model-value="tabActiva" @update:model-value="cambiarTab">
        <template #panel-listado>
          <div class="page__section">
            <AppCard compacta>
              <div class="ventas-filtros">
                <AppInput
                  v-model="filtros.texto"
                  label="Buscar"
                  type="search"
                  placeholder="Cliente, CUIT o comprobante"
                />
                <AppInput v-model="filtros.desde" label="Desde" type="date" />
                <AppInput v-model="filtros.hasta" label="Hasta" type="date" />
                <AppSelect
                  label="Estado de cobro"
                  placeholder="Todos"
                  :model-value="filtros.estadoCobro"
                  :opciones="opcionesEstadoCobro"
                  @update:model-value="cambiarFiltroEstadoCobro"
                />
                <AppSelect
                  label="Estado contable"
                  placeholder="Todos"
                  :model-value="filtros.estadoContable"
                  :opciones="opcionesEstadoContable"
                  @update:model-value="cambiarFiltroEstadoContable"
                />
                <div class="ventas-filtros__acciones">
                  <AppButton variante="secundario" tamano="sm" @click="limpiarFiltros">
                    <FilterX :size="15" aria-hidden="true" />
                    Limpiar
                  </AppButton>
                </div>
              </div>
            </AppCard>

            <AppCard
              titulo="Comprobantes recibidos"
              :descripcion="`${ventasFiltradas.length} operaciones coinciden con los filtros`"
            >
              <template #acciones>
                <AppBadge tipo="info">{{ ventasFiltradas.length }}</AppBadge>
              </template>

              <div class="ventas-tabla">
                <DataTable
                  :columnas="columnasVentas"
                  :filas="filasVentas"
                  clave-fila="id"
                  compacta
                  vacio-titulo="Sin ventas para los filtros"
                  vacio-mensaje="Probá con otro cliente, rango de fechas o estado."
                >
                  <template #celda-comprobante="{ fila }">
                    <button
                      type="button"
                      class="ventas-enlace"
                      @click="abrirDetalle(String(fila.id))"
                    >
                      <AppBadge tipo="marca">{{ fila.tipoComprobante }}</AppBadge>
                      <span class="texto-mono">{{ fila.numero }}</span>
                    </button>
                  </template>
                  <template #celda-cliente="{ fila }">
                    <span class="ventas-cliente">
                      <strong>{{ fila.cliente }}</strong>
                      <small>CUIT {{ fila.cuit }}</small>
                    </span>
                  </template>
                  <template #celda-total="{ fila }">
                    <span class="texto-mono">{{ fila.totalTexto }}</span>
                  </template>
                  <template #celda-estadoCobro="{ fila }">
                    <AppBadge :tipo="tipoBadgeEstadoCobro(fila.estadoCobro)">
                      {{ fila.estadoCobroTexto }}
                    </AppBadge>
                  </template>
                  <template #celda-estadoContable="{ fila }">
                    <AppBadge :tipo="tipoBadgeEstadoContable(fila.estadoContable)">
                      {{ fila.estadoContableTexto }}
                    </AppBadge>
                  </template>
                  <template #celda-acciones="{ fila }">
                    <AppButton
                      variante="fantasma"
                      tamano="sm"
                      solo-icono
                      aria-label="Ver detalle de la venta"
                      @click="abrirDetalle(String(fila.id))"
                    >
                      <Eye :size="16" aria-hidden="true" />
                    </AppButton>
                  </template>
                </DataTable>
              </div>

              <template #pie>
                <AppPagination
                  :pagina="pagina"
                  :total-paginas="totalPaginas"
                  :total-registros="ventasFiltradas.length"
                  etiqueta-registros="ventas"
                  @update:pagina="irAPagina"
                />
              </template>
            </AppCard>
          </div>
        </template>

        <template #panel-cuentas-por-cobrar>
          <AppCard
            titulo="Cuentas por cobrar"
            descripcion="Cuentas por cobrar registradas pendientes de cobro, agrupadas por cliente."
          >
            <template #acciones>
              <AppBadge tipo="advertencia">
                {{ formatearMoneda(totalCuentasPorCobrar) }}
              </AppBadge>
            </template>

            <div class="ventas-tabla">
              <DataTable
                :columnas="columnasCuentasPorCobrar"
                :filas="filasCuentasPorCobrar"
                clave-fila="id"
                compacta
                vacio-titulo="Sin cuentas por cobrar"
                vacio-mensaje="Todas las obligaciones registradas se encuentran canceladas."
              >
                <template #celda-cliente="{ fila }">
                  <span class="ventas-cliente">
                    <strong>{{ fila.cliente }}</strong>
                    <small>CUIT {{ fila.cuit }}</small>
                  </span>
                </template>
                <template #celda-vencimiento="{ fila }">
                  {{ fila.vencimientoTexto }}
                </template>
                <template #celda-saldo="{ fila }">
                  <span class="texto-mono">{{ fila.saldoTexto }}</span>
                </template>
                <template #celda-acciones="{ fila }">
                  <AppButton
                    variante="secundario"
                    tamano="sm"
                    @click="verVentasCliente(String(fila.cliente))"
                  >
                    Ver ventas
                  </AppButton>
                </template>
              </DataTable>
            </div>
          </AppCard>
        </template>
      </AppTabs>
    </template>

    <AppModal
      :model-value="Boolean(ventaDetalle)"
      :titulo="ventaDetalle ? `Venta ${ventaDetalle.numero}` : 'Detalle de venta'"
      descripcion="Información comercial, factura recibida y trazabilidad de la operación."
      tamano="xl"
      @update:model-value="alCambiarDetalle"
    >
      <template v-if="ventaDetalle">
        <div class="ventas-detalle__cabecera">
          <AppBadge :tipo="tipoBadgeEstadoCobro(estadoCobroDetalle)" punto>
            Cobro: {{ etiquetaEstadoCobro(estadoCobroDetalle) }}
          </AppBadge>
          <AppBadge :tipo="tipoBadgeEstadoContable(estadoContableDetalle)">
            Contable: {{ etiquetaEstadoContable(estadoContableDetalle) }}
          </AppBadge>
          <span class="texto-suave">
            {{ formatearFecha(ventaDetalle.fecha) }} · {{ clienteDetalle?.nombre }}
          </span>
        </div>

        <AppTabs v-model="tabDetalle" :tabs="tabsDetalle">
          <template #panel-resumen>
            <div class="ventas-detalle">
              <dl class="ventas-datos ventas-datos--detalle">
                <div>
                  <dt>Cliente</dt>
                  <dd>{{ clienteDetalle?.nombre ?? '—' }}</dd>
                </div>
                <div>
                  <dt>CUIT</dt>
                  <dd>{{ clienteDetalle?.cuit ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Tipo de comprobante</dt>
                  <dd>{{ ventaDetalle.tipoComprobante }}</dd>
                </div>
                <div>
                  <dt>Número</dt>
                  <dd class="texto-mono">{{ ventaDetalle.numero }}</dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd>{{ formatearFecha(ventaDetalle.fecha) }}</dd>
                </div>
                <div>
                  <dt>Vencimiento</dt>
                  <dd>{{ formatearFecha(ventaDetalle.vencimiento) }}</dd>
                </div>
                <div>
                  <dt>Condición de venta</dt>
                  <dd>
                    {{ ventaDetalle.condicionVenta === 'contado' ? 'Contado' : 'Cuenta corriente' }}
                  </dd>
                </div>
                <div>
                  <dt>Saldo pendiente</dt>
                  <dd class="texto-mono">{{ formatearMoneda(saldoDetalle) }}</dd>
                </div>
              </dl>

              <div class="ventas-detalle__items">
                <table class="ui-tabla ui-tabla--compacta">
                  <thead>
                    <tr>
                      <th scope="col">Descripción</th>
                      <th scope="col" class="ui-tabla__celda--derecha">Cantidad</th>
                      <th scope="col" class="ui-tabla__celda--derecha">Precio</th>
                      <th scope="col" class="ui-tabla__celda--derecha">IVA</th>
                      <th scope="col" class="ui-tabla__celda--derecha">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, indice) in ventaDetalle.items" :key="indice">
                      <td>{{ item.descripcion }}</td>
                      <td class="ui-tabla__celda--derecha">{{ item.cantidad }}</td>
                      <td class="ui-tabla__celda--derecha texto-mono">
                        {{ formatearMoneda(item.precioUnitario) }}
                      </td>
                      <td class="ui-tabla__celda--derecha">{{ item.alicuotaIva }}%</td>
                      <td class="ui-tabla__celda--derecha texto-mono">
                        {{ formatearMoneda(item.cantidad * item.precioUnitario) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="ventas-detalle__totales">
                <div class="ventas-totales">
                  <div class="ventas-totales__fila">
                    <span>Subtotal</span>
                    <strong class="texto-mono">{{ formatearMoneda(ventaDetalle.subtotal) }}</strong>
                  </div>
                  <div class="ventas-totales__fila">
                    <span>IVA</span>
                    <strong class="texto-mono">{{ formatearMoneda(ventaDetalle.iva) }}</strong>
                  </div>
                  <div class="ventas-totales__fila ventas-totales__fila--total">
                    <span>Total</span>
                    <strong class="texto-mono">{{ formatearMoneda(ventaDetalle.total) }}</strong>
                  </div>
                </div>
              </div>

              <div v-if="cobrosDetalle.length" class="ventas-cobros">
                <h4>Cobros aplicados</h4>
                <ul>
                  <li v-for="pago in cobrosDetalle" :key="pago.id">
                    <span>{{ formatearFecha(pago.fecha) }} · {{ pago.numero }}</span>
                    <strong class="texto-mono">{{ formatearMoneda(pago.importe) }}</strong>
                  </li>
                </ul>
              </div>

              <p class="ventas-aviso">
                <Send :size="15" aria-hidden="true" />
                <template v-if="estadoContableDetalle === 'registrado'">
                  La operación fue registrada contablemente.
                </template>
                <template v-else>
                  La factura recibida y el asiento propuesto están en la bandeja de Contaduría.
                </template>
              </p>
            </div>
          </template>

          <template #panel-factura>
            <DocumentViewer v-if="facturaDetalle" :documento="facturaDetalle" />
          </template>

          <template #panel-trazabilidad>
            <TraceTimeline :pasos="pasosDetalle" />
          </template>
        </AppTabs>
      </template>

      <template #pie>
        <AppButton variante="secundario" @click="cerrarDetalle">Cerrar</AppButton>
        <RouterLink
          v-if="documentoDetalle"
          class="ui-button ui-button--secundario"
          :to="{
            name: 'contaduria',
            query: { vista: 'bandeja', documento: documentoDetalle.id },
          }"
        >
          <Send :size="15" aria-hidden="true" />
          Abrir en Contaduría
        </RouterLink>
        <AppButton @click="imprimirFactura">
          <Printer :size="16" aria-hidden="true" />
          Imprimir factura
        </AppButton>
      </template>
    </AppModal>
  </section>
</template>
