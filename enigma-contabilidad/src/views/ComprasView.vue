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
  ALICUOTAS_IVA_COMPRA,
  TIPOS_COMPROBANTE_COMPRA,
  agruparCuentasPorPagar,
  calcularVencimiento,
  estadoContableCompra,
  etiquetaEstadoContable,
  etiquetaEstadoPago,
  filtrarCompras,
  filtrosCompraVacios,
  hayErroresCompra,
  resumirCompras,
  siguienteNumeroComprobanteCompra,
  validarCompra,
  type ErroresItemCompra,
  type FiltrosCompra,
} from '@/core/compras'
import { estadoPagoCompra, saldoPendienteCompra } from '@/core/contabilidad'
import { calcularTotales, formatearFecha, formatearMoneda } from '@/core/dinero'
import { CODIGOS } from '@/data/plan-cuentas'
import { useContabilidadStore } from '@/stores/contabilidad'
import { useUiStore } from '@/stores/ui'
import type { FechaISO } from '@/types'
import type { Compra, ItemCompra } from '@/types/contabilidad'

/* -------------------------------------------------------------------------- */
/* Estado de la pantalla                                                      */
/* -------------------------------------------------------------------------- */

type VistaCompras = 'listado' | 'cuentas-por-pagar' | 'nueva'

interface ItemFormulario {
  clave: number
  productoId: string
  descripcion: string
  cantidad: string
  precioUnitario: number
  alicuotaIva: string
}

const contabilidad = useContabilidadStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const empresa = computed(() => contabilidad.estado.empresa)
const periodo = computed(() => contabilidad.estado.periodo)

const vista = computed<VistaCompras>(() => {
  if (route.query.vista === 'nueva') return 'nueva'
  if (route.query.vista === 'cuentas-por-pagar') return 'cuentas-por-pagar'
  return 'listado'
})

const tabsListado = computed<TabItem[]>(() => [
  {
    id: 'listado',
    etiqueta: 'Comprobantes recibidos',
    badge: contabilidad.estado.compras.length,
  },
  {
    id: 'cuentas-por-pagar',
    etiqueta: 'Cuentas por pagar',
    badge: cuentasPorPagar.value.length,
  },
])

const tabActiva = computed(() =>
  vista.value === 'cuentas-por-pagar' ? 'cuentas-por-pagar' : 'listado',
)

function cambiarTab(id: string): void {
  void router.push({
    name: 'compras',
    query: id === 'cuentas-por-pagar' ? { vista: 'cuentas-por-pagar' } : {},
  })
}

function abrirFormulario(): void {
  reiniciarFormulario()
  void router.push({ name: 'compras', query: { vista: 'nueva' } })
}

function volverListado(): void {
  void router.push({ name: 'compras' })
}

/* -------------------------------------------------------------------------- */
/* Listado, filtros y resumen                                                 */
/* -------------------------------------------------------------------------- */

const filtros = reactive<FiltrosCompra>(filtrosCompraVacios())
const pagina = ref(1)
const tamanoPagina = 8

const comprasFiltradas = computed(() =>
  filtrarCompras(
    contabilidad.estado.compras,
    contabilidad.estado.proveedores,
    contabilidad.estado.pagos,
    contabilidad.estado.documentos,
    filtros,
  ),
)

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(comprasFiltradas.value.length / tamanoPagina)),
)

const comprasPagina = computed(() => {
  const inicio = (pagina.value - 1) * tamanoPagina
  return comprasFiltradas.value.slice(inicio, inicio + tamanoPagina)
})

watch(
  () => [filtros.texto, filtros.desde, filtros.hasta, filtros.estadoPago, filtros.estadoContable],
  () => {
    pagina.value = 1
  },
)

watch(totalPaginas, (total) => {
  if (pagina.value > total) pagina.value = total
})

const resumen = computed(() =>
  resumirCompras(
    contabilidad.estado.compras,
    contabilidad.estado.pagos,
    contabilidad.estado.documentos,
  ),
)

const proveedoresPorId = computed(
  () => new Map(contabilidad.estado.proveedores.map((proveedor) => [proveedor.id, proveedor])),
)
const documentosPorId = computed(
  () => new Map(contabilidad.estado.documentos.map((documento) => [documento.id, documento])),
)

const filasCompras = computed<Record<string, unknown>[]>(() =>
  comprasPagina.value.map((compra) => {
    const proveedor = proveedoresPorId.value.get(compra.proveedorId)
    const documento = documentosPorId.value.get(compra.documentoId)
    const estadoPago = estadoPagoCompra(compra, contabilidad.estado.pagos)
    const estadoContable = documento?.estado ?? 'pendiente'
    const saldo = saldoPendienteCompra(compra, contabilidad.estado.pagos)

    return {
      id: compra.id,
      fecha: formatearFecha(compra.fecha),
      numero: compra.numero,
      tipoComprobante: compra.tipoComprobante,
      proveedor: proveedor?.nombre ?? 'Proveedor',
      cuit: proveedor?.cuit ?? '—',
      condicion: compra.condicionPago === 'contado' ? 'Contado' : 'Cuenta corriente',
      total: compra.total,
      totalTexto: formatearMoneda(compra.total),
      ivaTexto: formatearMoneda(compra.iva),
      estadoPago,
      estadoPagoTexto: etiquetaEstadoPago(estadoPago),
      estadoContable,
      estadoContableTexto: etiquetaEstadoContable(estadoContable),
      saldo,
      saldoTexto: formatearMoneda(saldo),
    }
  }),
)

const columnasCompras: readonly ColumnaTabla[] = [
  { clave: 'fecha', titulo: 'Fecha', ancho: '92px' },
  { clave: 'comprobante', titulo: 'Comprobante' },
  { clave: 'proveedor', titulo: 'Proveedor' },
  { clave: 'condicion', titulo: 'Condición', ancho: '124px' },
  { clave: 'total', titulo: 'Total', alineacion: 'derecha' },
  { clave: 'estadoPago', titulo: 'Pago', alineacion: 'centro' },
  { clave: 'estadoContable', titulo: 'Contable', alineacion: 'centro' },
  { clave: 'acciones', titulo: '', alineacion: 'derecha', ancho: '72px' },
]

const opcionesEstadoPago: readonly OpcionSelect[] = [
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'parcial', etiqueta: 'Parcial' },
  { valor: 'pagada', etiqueta: 'Pagada' },
]

const opcionesEstadoContable: readonly OpcionSelect[] = [
  { valor: 'pendiente', etiqueta: 'Pendiente de revisión' },
  { valor: 'en_revision', etiqueta: 'En revisión' },
  { valor: 'aprobado', etiqueta: 'Aprobado' },
  { valor: 'registrado', etiqueta: 'Registrado' },
  { valor: 'observado', etiqueta: 'Observado' },
]

function cambiarFiltroEstadoPago(valor: string): void {
  filtros.estadoPago = valor as FiltrosCompra['estadoPago']
}

function cambiarFiltroEstadoContable(valor: string): void {
  filtros.estadoContable = valor as FiltrosCompra['estadoContable']
}

function limpiarFiltros(): void {
  Object.assign(filtros, filtrosCompraVacios())
  pagina.value = 1
}

function irAPagina(nueva: number): void {
  pagina.value = nueva
}

function tipoBadgeEstadoPago(estado: unknown): TipoBadge {
  switch (estado) {
    case 'pagada':
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
/* Cuentas por pagar                                                          */
/* -------------------------------------------------------------------------- */

const cuentasPorPagar = computed(() =>
  agruparCuentasPorPagar(
    contabilidad.estado.compras,
    contabilidad.estado.proveedores,
    contabilidad.estado.pagos,
    contabilidad.estado.documentos,
  ),
)

const totalCuentasPorPagar = computed(() =>
  cuentasPorPagar.value.reduce((total, cuenta) => total + cuenta.saldo, 0),
)

const filasCuentasPorPagar = computed<Record<string, unknown>[]>(() =>
  cuentasPorPagar.value.map((cuenta) => ({
    id: cuenta.proveedorId,
    proveedor: cuenta.proveedor,
    cuit: cuenta.cuit,
    comprobantes: cuenta.comprobantes,
    vencimiento: cuenta.vencimiento,
    vencimientoTexto: cuenta.vencimiento ? formatearFecha(cuenta.vencimiento) : '—',
    saldo: cuenta.saldo,
    saldoTexto: formatearMoneda(cuenta.saldo),
  })),
)

const columnasCuentasPorPagar: readonly ColumnaTabla[] = [
  { clave: 'proveedor', titulo: 'Proveedor' },
  { clave: 'comprobantes', titulo: 'Comprobantes', alineacion: 'centro' },
  { clave: 'vencimiento', titulo: 'Próximo vencimiento' },
  { clave: 'saldo', titulo: 'Saldo pendiente', alineacion: 'derecha' },
  { clave: 'acciones', titulo: '', alineacion: 'derecha', ancho: '96px' },
]

function verComprasProveedor(proveedor: string): void {
  filtros.texto = proveedor
  pagina.value = 1
  void router.push({ name: 'compras' })
}

/* -------------------------------------------------------------------------- */
/* Detalle y factura recibida                                                 */
/* -------------------------------------------------------------------------- */

const compraDetalleId = ref<string | null>(null)
const tabDetalle = ref('resumen')

const compraDetalle = computed(
  () => contabilidad.estado.compras.find((compra) => compra.id === compraDetalleId.value) ?? null,
)

const proveedorDetalle = computed(() =>
  compraDetalle.value
    ? contabilidad.estado.proveedores.find(
        (proveedor) => proveedor.id === compraDetalle.value?.proveedorId,
      )
    : undefined,
)

const documentoDetalle = computed(() =>
  compraDetalle.value
    ? contabilidad.estado.documentos.find(
        (documento) => documento.id === compraDetalle.value?.documentoId,
      )
    : undefined,
)

const asientoDetalle = computed(() =>
  compraDetalle.value
    ? contabilidad.estado.asientos.find((asiento) => asiento.id === compraDetalle.value?.asientoId)
    : undefined,
)

const pagosDetalle = computed(() =>
  compraDetalle.value
    ? contabilidad.estado.pagos.filter((pago) => pago.compraId === compraDetalle.value?.id)
    : [],
)

const estadoPagoDetalle = computed(() =>
  compraDetalle.value
    ? estadoPagoCompra(compraDetalle.value, contabilidad.estado.pagos)
    : 'pendiente',
)

const estadoContableDetalle = computed(() =>
  compraDetalle.value
    ? estadoContableCompra(compraDetalle.value, contabilidad.estado.documentos)
    : 'pendiente',
)

const saldoDetalle = computed(() =>
  compraDetalle.value ? saldoPendienteCompra(compraDetalle.value, contabilidad.estado.pagos) : 0,
)

const tabsDetalle: readonly TabItem[] = [
  { id: 'resumen', etiqueta: 'Resumen' },
  { id: 'factura', etiqueta: 'Factura recibida' },
  { id: 'trazabilidad', etiqueta: 'Trazabilidad' },
]

const facturaDetalle = computed<DocumentoVista | null>(() => {
  const compra = compraDetalle.value
  const proveedor = proveedorDetalle.value
  if (!compra || !proveedor) return null

  const condicion = compra.condicionPago === 'contado' ? 'Contado' : 'Cuenta corriente'

  return {
    tipoEtiqueta: compra.tipoComprobante,
    numero: compra.numero,
    fecha: compra.fecha,
    estadoEtiqueta: `Estado contable: ${etiquetaEstadoContable(estadoContableDetalle.value)}`,
    emisor: {
      nombre: proveedor.nombre,
      cuit: proveedor.cuit,
      direccion: proveedor.direccion,
      condicionIva: proveedor.condicionIva,
    },
    receptor: {
      nombre: empresa.value.razonSocial,
      cuit: empresa.value.cuit,
      direccion: empresa.value.direccion,
      condicionIva: 'Responsable Inscripto',
      logoSrc: empresa.value.logoDataUrl,
    },
    items: compra.items.map((item) => ({
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      alicuotaIva: item.alicuotaIva,
    })),
    subtotal: compra.subtotal,
    iva: compra.iva,
    total: compra.total,
    observaciones: `Compra registrada en Enigma Gestión. Condición de pago: ${condicion}. Vencimiento: ${formatearFecha(compra.vencimiento)}. Documento simulado para la demostración.`,
  }
})

const pasosDetalle = computed<PasoTimeline[]>(() => {
  const compra = compraDetalle.value
  if (!compra) return []

  const registrado = estadoContableDetalle.value === 'registrado'
  const estadoPago = estadoPagoDetalle.value

  return [
    {
      titulo: 'Compra registrada',
      fecha: formatearFecha(compra.fecha),
      descripcion: `Alta de la operación ${compra.numero}.`,
      estado: 'completado',
    },
    {
      titulo: 'Factura recibida generada',
      fecha: formatearFecha(compra.fecha),
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
      titulo: 'Pago al proveedor',
      descripcion:
        estadoPago === 'pagada'
          ? 'La obligación se encuentra cancelada.'
          : estadoPago === 'parcial'
            ? `Pago parcial registrado. Saldo: ${formatearMoneda(saldoDetalle.value)}.`
            : `Saldo pendiente: ${formatearMoneda(saldoDetalle.value)}.`,
      estado:
        estadoPago === 'pagada' ? 'completado' : estadoPago === 'parcial' ? 'actual' : 'pendiente',
      to: '/tesoreria?vista=pagos',
    },
  ]
})

watch(
  () => route.query.operacion,
  (valor) => {
    if (
      typeof valor === 'string' &&
      contabilidad.estado.compras.some((compra) => compra.id === valor)
    ) {
      compraDetalleId.value = valor
    } else if (typeof valor !== 'string') {
      compraDetalleId.value = null
    }
  },
  { immediate: true },
)

function abrirDetalle(id: string): void {
  compraDetalleId.value = id
  tabDetalle.value = 'resumen'
  void router.replace({ name: 'compras', query: { ...route.query, operacion: id } })
}

function cerrarDetalle(): void {
  compraDetalleId.value = null
  if (route.query.operacion) {
    const query = { ...route.query }
    delete query.operacion
    void router.replace({ name: 'compras', query })
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
  proveedorId: string
  fecha: string
  vencimiento: string
  tipoComprobante: string
  condicionPago: Compra['condicionPago']
  items: ItemFormulario[]
}>({
  proveedorId: '',
  fecha: fechaInicialFormulario,
  vencimiento: calcularVencimiento(fechaInicialFormulario as FechaISO, 'cuenta_corriente'),
  tipoComprobante: 'Factura A',
  condicionPago: 'cuenta_corriente',
  items: [crearItemFormulario()],
})

const intentoEnvio = ref(false)
const guardando = ref(false)

watch(
  () => [form.fecha, form.condicionPago],
  () => {
    if (!form.fecha) return
    form.vencimiento = calcularVencimiento(form.fecha as FechaISO, form.condicionPago)
  },
)

const proveedorFormulario = computed(() =>
  contabilidad.estado.proveedores.find((proveedor) => proveedor.id === form.proveedorId),
)

const cuitFormulario = computed(() => proveedorFormulario.value?.cuit ?? '')

const numeroSugerido = computed(() =>
  siguienteNumeroComprobanteCompra(contabilidad.estado.compras, form.tipoComprobante),
)

const proveedoresFormulario = computed<OpcionSelect[]>(() =>
  contabilidad.estado.proveedores.map((proveedor) => ({
    valor: proveedor.id,
    etiqueta: `${proveedor.nombre} · ${proveedor.cuit}`,
  })),
)

const productosFormulario = computed<OpcionSelect[]>(() =>
  contabilidad.estado.productos.map((producto) => ({
    valor: producto.id,
    etiqueta: `${producto.codigo} · ${producto.nombre}`,
  })),
)

const tiposComprobanteFormulario: readonly OpcionSelect[] = TIPOS_COMPROBANTE_COMPRA.map(
  (tipo) => ({ valor: tipo, etiqueta: tipo }),
)

const condicionesPagoFormulario: readonly OpcionSelect[] = [
  { valor: 'cuenta_corriente', etiqueta: 'Cuenta corriente' },
  { valor: 'contado', etiqueta: 'Contado' },
]

const alicuotasFormulario: readonly OpcionSelect[] = ALICUOTAS_IVA_COMPRA.map((alicuota) => ({
  valor: String(alicuota),
  etiqueta: `${String(alicuota).replace('.', ',')}%`,
}))

function alSeleccionarProducto(item: ItemFormulario, productoId: string): void {
  item.productoId = productoId
  const producto = contabilidad.estado.productos.find((actual) => actual.id === productoId)
  if (!producto) return

  item.descripcion = producto.nombre
  item.precioUnitario = producto.costo > 0 ? producto.costo : producto.precioVenta
  item.alicuotaIva = String(producto.alicuotaIva)
}

function cambiarCondicionPago(valor: string): void {
  form.condicionPago = valor === 'contado' ? 'contado' : 'cuenta_corriente'
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

function itemParaCompra(item: ItemFormulario): ItemCompra {
  const producto = contabilidad.estado.productos.find((actual) => actual.id === item.productoId)
  return {
    productoId: item.productoId,
    descripcion: item.descripcion.trim(),
    cantidad: Number(item.cantidad) || 0,
    precioUnitario: item.precioUnitario,
    alicuotaIva: Number(item.alicuotaIva) || 0,
    cuentaContable: producto?.cuentaCompra ?? CODIGOS.MERCADERIAS,
  }
}

const itemsFormulario = computed<ItemCompra[]>(() => form.items.map(itemParaCompra))

const totalesFormulario = computed(() => calcularTotales(itemsFormulario.value))

const erroresFormulario = computed(() =>
  validarCompra(
    {
      proveedorId: form.proveedorId,
      fecha: form.fecha,
      vencimiento: form.vencimiento,
      tipoComprobante: form.tipoComprobante,
      numero: numeroSugerido.value,
      condicionPago: form.condicionPago,
      items: itemsFormulario.value,
    },
    contabilidad.estado.compras,
  ),
)

function errorCampo(
  campo:
    | 'proveedorId'
    | 'fecha'
    | 'vencimiento'
    | 'tipoComprobante'
    | 'numero'
    | 'condicionPago'
    | 'items',
): string | undefined {
  return intentoEnvio.value ? erroresFormulario.value[campo] : undefined
}

function errorItem(indice: number, campo: keyof ErroresItemCompra): string | undefined {
  return intentoEnvio.value ? erroresFormulario.value.porItem[indice]?.[campo] : undefined
}

function reiniciarFormulario(): void {
  intentoEnvio.value = false
  const fecha = fechaInicial()
  form.proveedorId = ''
  form.fecha = fecha
  form.vencimiento = calcularVencimiento(fecha as FechaISO, 'cuenta_corriente')
  form.tipoComprobante = 'Factura A'
  form.condicionPago = 'cuenta_corriente'
  form.items = [crearItemFormulario()]
}

async function registrarCompra(): Promise<void> {
  intentoEnvio.value = true
  const errores = erroresFormulario.value

  if (hayErroresCompra(errores)) {
    ui.notificar({
      tipo: 'error',
      titulo: 'Revisá los datos de la compra',
      mensaje: 'Hay campos obligatorios incompletos o importes inválidos.',
    })
    return
  }

  const proveedor = proveedorFormulario.value
  if (!proveedor) return

  guardando.value = true
  const resultado = contabilidad.registrarCompra({
    proveedor,
    fecha: form.fecha as FechaISO,
    vencimiento: form.vencimiento as FechaISO,
    tipoComprobante: form.tipoComprobante,
    numero: numeroSugerido.value,
    condicionPago: form.condicionPago,
    items: itemsFormulario.value,
  })
  guardando.value = false

  if (!resultado.ok || !resultado.compra) {
    ui.notificar({
      tipo: 'error',
      titulo: 'No se pudo registrar la compra',
      mensaje:
        resultado.motivo === 'numero_duplicado'
          ? 'El número de comprobante ya existe.'
          : 'Revisá los datos ingresados e intentá nuevamente.',
    })
    return
  }

  const compra = resultado.compra
  ui.notificar({
    tipo: 'exito',
    titulo: 'Compra registrada',
    mensaje: `${compra.numero} enviada a la bandeja de Contaduría.`,
  })

  reiniciarFormulario()
  tabDetalle.value = 'factura'
  await router.push({ name: 'compras', query: { operacion: compra.id } })
}
</script>

<template>
  <section class="page compras">
    <div class="page__header">
      <div>
        <h2>Compras</h2>
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
          Nueva compra
        </AppButton>
      </div>
    </div>

    <template v-if="vista === 'nueva'">
      <div class="page__section-header">
        <div>
          <h3>Registrar compra</h3>
          <p>Completá los datos del comprobante recibido y sus productos o servicios.</p>
        </div>
        <AppButton variante="secundario" @click="volverListado">
          <ArrowLeft :size="16" aria-hidden="true" />
          Volver al listado
        </AppButton>
      </div>

      <form class="compras-formulario" novalidate @submit.prevent="registrarCompra">
        <div class="compras-formulario__principal">
          <AppCard
            titulo="Datos del comprobante"
            descripcion="El número se genera automáticamente según el tipo elegido."
          >
            <div class="compras-formulario__campos">
              <AppSelect
                id="compra-proveedor"
                v-model="form.proveedorId"
                label="Proveedor"
                placeholder="Seleccionar proveedor"
                :opciones="proveedoresFormulario"
                :error="errorCampo('proveedorId')"
                required
              />
              <AppInput
                id="compra-cuit"
                label="CUIT"
                :model-value="cuitFormulario"
                placeholder="Se completa con el proveedor"
                readonly
                hint="Dato fiscal del proveedor seleccionado."
              />
              <AppInput
                id="compra-fecha"
                v-model="form.fecha"
                label="Fecha"
                type="date"
                :error="errorCampo('fecha')"
                required
              />
              <AppInput
                id="compra-vencimiento"
                v-model="form.vencimiento"
                label="Vencimiento"
                type="date"
                :error="errorCampo('vencimiento')"
                required
              />
              <AppSelect
                id="compra-tipo"
                v-model="form.tipoComprobante"
                label="Tipo de comprobante"
                :opciones="tiposComprobanteFormulario"
                :error="errorCampo('tipoComprobante')"
                required
              />
              <AppInput
                id="compra-numero"
                label="Número de comprobante"
                :model-value="numeroSugerido"
                readonly
                hint="Numeración automática y correlativa."
                :error="errorCampo('numero')"
              />
              <AppSelect
                id="compra-condicion"
                label="Condición de pago"
                :model-value="form.condicionPago"
                :opciones="condicionesPagoFormulario"
                :error="errorCampo('condicionPago')"
                required
                @update:model-value="cambiarCondicionPago"
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

            <p v-if="errorCampo('items')" class="compras-error">
              {{ errorCampo('items') }}
            </p>

            <div class="compras-items">
              <div v-for="(item, indice) in form.items" :key="item.clave" class="compras-item">
                <AppSelect
                  :id="`compra-producto-${indice}`"
                  label="Producto o servicio"
                  placeholder="Seleccionar"
                  :model-value="item.productoId"
                  :opciones="productosFormulario"
                  :error="errorItem(indice, 'productoId')"
                  @update:model-value="(valor) => alSeleccionarProducto(item, valor)"
                />
                <AppInput
                  :id="`compra-descripcion-${indice}`"
                  v-model="item.descripcion"
                  label="Descripción"
                  :error="errorItem(indice, 'descripcion')"
                />
                <AppInput
                  :id="`compra-cantidad-${indice}`"
                  v-model="item.cantidad"
                  label="Cantidad"
                  type="number"
                  min="1"
                  step="1"
                  :error="errorItem(indice, 'cantidad')"
                />
                <CurrencyInput
                  :id="`compra-precio-${indice}`"
                  v-model="item.precioUnitario"
                  label="Precio unitario"
                  :error="errorItem(indice, 'precioUnitario')"
                />
                <AppSelect
                  :id="`compra-iva-${indice}`"
                  label="IVA"
                  :model-value="item.alicuotaIva"
                  :opciones="alicuotasFormulario"
                  :error="errorItem(indice, 'alicuotaIva')"
                  @update:model-value="(valor) => (item.alicuotaIva = valor)"
                />
                <div class="compras-item__subtotal">
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

        <aside class="compras-formulario__lateral">
          <AppCard titulo="Resumen de la compra" descripcion="Importes calculados al centavo.">
            <div class="compras-totales">
              <div class="compras-totales__fila">
                <span>Subtotal</span>
                <strong class="texto-mono">{{
                  formatearMoneda(totalesFormulario.subtotal)
                }}</strong>
              </div>
              <div class="compras-totales__fila">
                <span>IVA</span>
                <strong class="texto-mono">{{ formatearMoneda(totalesFormulario.iva) }}</strong>
              </div>
              <div class="compras-totales__fila compras-totales__fila--total">
                <span>Total</span>
                <strong class="texto-mono">{{ formatearMoneda(totalesFormulario.total) }}</strong>
              </div>
            </div>

            <p class="compras-aviso">
              <Send :size="15" aria-hidden="true" />
              Al confirmar, la factura recibida y el asiento propuesto se envían a la bandeja de
              Contaduría.
            </p>
          </AppCard>

          <AppCard
            v-if="proveedorFormulario"
            titulo="Proveedor seleccionado"
            descripcion="Datos fiscales y de contacto."
          >
            <dl class="compras-datos">
              <div>
                <dt>CUIT</dt>
                <dd>{{ proveedorFormulario.cuit }}</dd>
              </div>
              <div>
                <dt>Condición IVA</dt>
                <dd>{{ proveedorFormulario.condicionIva }}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{{ proveedorFormulario.email }}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{{ proveedorFormulario.telefono }}</dd>
              </div>
            </dl>
          </AppCard>

          <div class="compras-formulario__acciones">
            <AppButton variante="secundario" @click="volverListado">Cancelar</AppButton>
            <AppButton type="submit" :cargando="guardando">
              <FileText :size="16" aria-hidden="true" />
              Registrar compra
            </AppButton>
          </div>
        </aside>
      </form>
    </template>

    <template v-else>
      <div class="compras-resumen">
        <article class="compras-resumen__item">
          <span class="compras-resumen__icono" aria-hidden="true"><ShoppingCart :size="17" /></span>
          <span>Comprobantes</span>
          <strong>{{ resumen.cantidad }}</strong>
          <small>{{ resumen.pendientesRegistracion }} sin registrar</small>
        </article>
        <article class="compras-resumen__item">
          <span class="compras-resumen__icono" aria-hidden="true"><FileText :size="17" /></span>
          <span>Total compras</span>
          <strong class="texto-mono">{{ formatearMoneda(resumen.total) }}</strong>
          <small>IVA crédito {{ formatearMoneda(resumen.iva) }}</small>
        </article>
        <article class="compras-resumen__item">
          <span class="compras-resumen__icono" aria-hidden="true"><Wallet :size="17" /></span>
          <span>Saldo pendiente</span>
          <strong class="texto-mono">{{ formatearMoneda(resumen.saldoPendiente) }}</strong>
          <small>Obligaciones con proveedores</small>
        </article>
        <article class="compras-resumen__item">
          <span class="compras-resumen__icono" aria-hidden="true"><Send :size="17" /></span>
          <span>En bandeja</span>
          <strong>{{ resumen.pendientesRegistracion }}</strong>
          <small>Pendientes de Contaduría</small>
        </article>
      </div>

      <AppTabs :tabs="tabsListado" :model-value="tabActiva" @update:model-value="cambiarTab">
        <template #panel-listado>
          <div class="page__section">
            <AppCard compacta>
              <div class="compras-filtros">
                <AppInput
                  v-model="filtros.texto"
                  label="Buscar"
                  type="search"
                  placeholder="Proveedor, CUIT o comprobante"
                />
                <AppInput v-model="filtros.desde" label="Desde" type="date" />
                <AppInput v-model="filtros.hasta" label="Hasta" type="date" />
                <AppSelect
                  label="Estado de pago"
                  placeholder="Todos"
                  :model-value="filtros.estadoPago"
                  :opciones="opcionesEstadoPago"
                  @update:model-value="cambiarFiltroEstadoPago"
                />
                <AppSelect
                  label="Estado contable"
                  placeholder="Todos"
                  :model-value="filtros.estadoContable"
                  :opciones="opcionesEstadoContable"
                  @update:model-value="cambiarFiltroEstadoContable"
                />
                <div class="compras-filtros__acciones">
                  <AppButton variante="secundario" tamano="sm" @click="limpiarFiltros">
                    <FilterX :size="15" aria-hidden="true" />
                    Limpiar
                  </AppButton>
                </div>
              </div>
            </AppCard>

            <AppCard
              titulo="Comprobantes recibidos"
              :descripcion="`${comprasFiltradas.length} operaciones coinciden con los filtros`"
            >
              <template #acciones>
                <AppBadge tipo="info">{{ comprasFiltradas.length }}</AppBadge>
              </template>

              <div class="compras-tabla">
                <DataTable
                  :columnas="columnasCompras"
                  :filas="filasCompras"
                  clave-fila="id"
                  compacta
                  vacio-titulo="Sin compras para los filtros"
                  vacio-mensaje="Probá con otro proveedor, rango de fechas o estado."
                >
                  <template #celda-comprobante="{ fila }">
                    <button
                      type="button"
                      class="compras-enlace"
                      @click="abrirDetalle(String(fila.id))"
                    >
                      <AppBadge tipo="marca">{{ fila.tipoComprobante }}</AppBadge>
                      <span class="texto-mono">{{ fila.numero }}</span>
                    </button>
                  </template>
                  <template #celda-proveedor="{ fila }">
                    <span class="compras-proveedor">
                      <strong>{{ fila.proveedor }}</strong>
                      <small>CUIT {{ fila.cuit }}</small>
                    </span>
                  </template>
                  <template #celda-total="{ fila }">
                    <span class="texto-mono">{{ fila.totalTexto }}</span>
                  </template>
                  <template #celda-estadoPago="{ fila }">
                    <AppBadge :tipo="tipoBadgeEstadoPago(fila.estadoPago)">
                      {{ fila.estadoPagoTexto }}
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
                      aria-label="Ver detalle de la compra"
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
                  :total-registros="comprasFiltradas.length"
                  etiqueta-registros="compras"
                  @update:pagina="irAPagina"
                />
              </template>
            </AppCard>
          </div>
        </template>

        <template #panel-cuentas-por-pagar>
          <AppCard
            titulo="Cuentas por pagar"
            descripcion="Obligaciones registradas pendientes de pago, agrupadas por proveedor."
          >
            <template #acciones>
              <AppBadge tipo="advertencia">
                {{ formatearMoneda(totalCuentasPorPagar) }}
              </AppBadge>
            </template>

            <div class="compras-tabla">
              <DataTable
                :columnas="columnasCuentasPorPagar"
                :filas="filasCuentasPorPagar"
                clave-fila="id"
                compacta
                vacio-titulo="Sin cuentas por pagar"
                vacio-mensaje="Todas las obligaciones registradas se encuentran canceladas."
              >
                <template #celda-proveedor="{ fila }">
                  <span class="compras-proveedor">
                    <strong>{{ fila.proveedor }}</strong>
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
                    @click="verComprasProveedor(String(fila.proveedor))"
                  >
                    Ver compras
                  </AppButton>
                </template>
              </DataTable>
            </div>
          </AppCard>
        </template>
      </AppTabs>
    </template>

    <AppModal
      :model-value="Boolean(compraDetalle)"
      :titulo="compraDetalle ? `Compra ${compraDetalle.numero}` : 'Detalle de compra'"
      descripcion="Información comercial, factura recibida y trazabilidad de la operación."
      tamano="xl"
      @update:model-value="alCambiarDetalle"
    >
      <template v-if="compraDetalle">
        <div class="compras-detalle__cabecera">
          <AppBadge :tipo="tipoBadgeEstadoPago(estadoPagoDetalle)" punto>
            Pago: {{ etiquetaEstadoPago(estadoPagoDetalle) }}
          </AppBadge>
          <AppBadge :tipo="tipoBadgeEstadoContable(estadoContableDetalle)">
            Contable: {{ etiquetaEstadoContable(estadoContableDetalle) }}
          </AppBadge>
          <span class="texto-suave">
            {{ formatearFecha(compraDetalle.fecha) }} · {{ proveedorDetalle?.nombre }}
          </span>
        </div>

        <AppTabs v-model="tabDetalle" :tabs="tabsDetalle">
          <template #panel-resumen>
            <div class="compras-detalle">
              <dl class="compras-datos compras-datos--detalle">
                <div>
                  <dt>Proveedor</dt>
                  <dd>{{ proveedorDetalle?.nombre ?? '—' }}</dd>
                </div>
                <div>
                  <dt>CUIT</dt>
                  <dd>{{ proveedorDetalle?.cuit ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Tipo de comprobante</dt>
                  <dd>{{ compraDetalle.tipoComprobante }}</dd>
                </div>
                <div>
                  <dt>Número</dt>
                  <dd class="texto-mono">{{ compraDetalle.numero }}</dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd>{{ formatearFecha(compraDetalle.fecha) }}</dd>
                </div>
                <div>
                  <dt>Vencimiento</dt>
                  <dd>{{ formatearFecha(compraDetalle.vencimiento) }}</dd>
                </div>
                <div>
                  <dt>Condición de pago</dt>
                  <dd>
                    {{ compraDetalle.condicionPago === 'contado' ? 'Contado' : 'Cuenta corriente' }}
                  </dd>
                </div>
                <div>
                  <dt>Saldo pendiente</dt>
                  <dd class="texto-mono">{{ formatearMoneda(saldoDetalle) }}</dd>
                </div>
              </dl>

              <div class="compras-detalle__items">
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
                    <tr v-for="(item, indice) in compraDetalle.items" :key="indice">
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

              <div class="compras-detalle__totales">
                <div class="compras-totales">
                  <div class="compras-totales__fila">
                    <span>Subtotal</span>
                    <strong class="texto-mono">{{
                      formatearMoneda(compraDetalle.subtotal)
                    }}</strong>
                  </div>
                  <div class="compras-totales__fila">
                    <span>IVA</span>
                    <strong class="texto-mono">{{ formatearMoneda(compraDetalle.iva) }}</strong>
                  </div>
                  <div class="compras-totales__fila compras-totales__fila--total">
                    <span>Total</span>
                    <strong class="texto-mono">{{ formatearMoneda(compraDetalle.total) }}</strong>
                  </div>
                </div>
              </div>

              <div v-if="pagosDetalle.length" class="compras-pagos">
                <h4>Pagos aplicados</h4>
                <ul>
                  <li v-for="pago in pagosDetalle" :key="pago.id">
                    <span>{{ formatearFecha(pago.fecha) }} · {{ pago.numero }}</span>
                    <strong class="texto-mono">{{ formatearMoneda(pago.importe) }}</strong>
                  </li>
                </ul>
              </div>

              <p class="compras-aviso">
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
