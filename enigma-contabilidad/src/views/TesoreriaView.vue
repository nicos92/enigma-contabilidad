<script setup lang="ts">
import {
  ArrowRightLeft,
  Banknote,
  Eye,
  FileText,
  FilterX,
  Plus,
  Receipt,
  Wallet,
} from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

import type { ColumnaTabla, OpcionSelect, TabItem } from '@/components/ui/tipos'
import {
  MEDIOS_PAGO,
  etiquetaMedioPago,
  filtrarPagos,
  filtrosPagoVacios,
  hayErroresPago,
  resumirPagos,
  validarPago,
  type ErroresPago,
  type FiltrosPago,
} from '@/core/pagos'
import {
  MEDIOS_COBRO,
  etiquetaMedioCobro,
  filtrarCobros,
  filtrosCobroVacios,
  hayErroresCobro,
  resumirCobros,
  validarCobro,
  type ErroresCobro,
  type FiltrosCobro,
} from '@/core/cobros'
import {
  CUENTAS_TESORERIA,
  filtrarTransferencias,
  filtrosTransferenciaVacios,
  hayErroresTransferencia,
  validarTransferencia,
  type ErroresTransferencia,
  type FiltrosTransferencia,
} from '@/core/transferencias'
import { saldoPendienteCompra, saldoPendienteVenta } from '@/core/contabilidad'
import { formatearFecha, formatearMoneda } from '@/core/dinero'
import { CODIGOS } from '@/data/plan-cuentas'
import { useContabilidadStore } from '@/stores/contabilidad'
import { useUiStore } from '@/stores/ui'
import type { FechaISO } from '@/types'
import type { MedioPago } from '@/types/contabilidad'

const contabilidad = useContabilidadStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const empresa = computed(() => contabilidad.estado.empresa)
const periodo = computed(() => contabilidad.estado.periodo)

type VistaTesoreria = 'pagos' | 'cobros' | 'movimientos'

const vista = computed<VistaTesoreria>(() => {
  if (route.query.vista === 'cobros') return 'cobros'
  if (route.query.vista === 'movimientos') return 'movimientos'
  return 'pagos'
})

function cambiarVista(id: string): void {
  void router.push({ name: 'tesoreria', query: { vista: id } })
}

const tabs: TabItem[] = [
  { id: 'pagos', etiqueta: 'Pagos' },
  { id: 'cobros', etiqueta: 'Cobros' },
  { id: 'movimientos', etiqueta: 'Movimientos de fondos' },
]

const tabActiva = computed(() => vista.value)

/* -------------------------------------------------------------------------- */
/* Pagos                                                                      */
/* -------------------------------------------------------------------------- */

const filtrosPago = reactive<FiltrosPago>(filtrosPagoVacios())
const paginaPago = ref(1)
const tamanoPagina = 8

const pagosFiltrados = computed(() =>
  filtrarPagos(
    contabilidad.estado.pagos,
    contabilidad.estado.proveedores,
    contabilidad.estado.compras,
    contabilidad.estado.documentos,
    filtrosPago,
  ),
)

const totalPaginasPago = computed(() =>
  Math.max(1, Math.ceil(pagosFiltrados.value.length / tamanoPagina)),
)

const pagosPagina = computed(() => {
  const inicio = (paginaPago.value - 1) * tamanoPagina
  return pagosFiltrados.value.slice(inicio, inicio + tamanoPagina)
})

watch(
  () => [
    filtrosPago.texto,
    filtrosPago.desde,
    filtrosPago.hasta,
    filtrosPago.medio,
    filtrosPago.estadoContable,
  ],
  () => {
    paginaPago.value = 1
  },
)

const resumenPagos = computed(() =>
  resumirPagos(contabilidad.estado.pagos, contabilidad.estado.documentos),
)

const proveedoresPorId = computed(
  () => new Map(contabilidad.estado.proveedores.map((proveedor) => [proveedor.id, proveedor])),
)
const comprasPorId = computed(
  () => new Map(contabilidad.estado.compras.map((compra) => [compra.id, compra])),
)
const documentosPorId = computed(
  () => new Map(contabilidad.estado.documentos.map((documento) => [documento.id, documento])),
)

const filasPagos = computed<Record<string, unknown>[]>(() =>
  pagosPagina.value.map((pago) => {
    const proveedor = proveedoresPorId.value.get(pago.proveedorId)
    const compra = comprasPorId.value.get(pago.compraId)
    const documento = documentosPorId.value.get(pago.documentoId)
    return {
      id: pago.id,
      fecha: formatearFecha(pago.fecha),
      numero: pago.numero,
      proveedor: proveedor?.nombre ?? 'Proveedor',
      comprobante: compra?.numero ?? '—',
      medio: etiquetaMedioPago(pago.medio),
      importe: pago.importe,
      importeTexto: formatearMoneda(pago.importe),
      estadoContable: documento?.estado ?? 'pendiente',
      estadoContableTexto: documento?.estado ?? 'pendiente',
    }
  }),
)

const columnasPagos: readonly ColumnaTabla[] = [
  { clave: 'fecha', titulo: 'Fecha', ancho: '92px' },
  { clave: 'numero', titulo: 'Comprobante' },
  { clave: 'proveedor', titulo: 'Proveedor' },
  { clave: 'comprobante', titulo: 'Factura' },
  { clave: 'medio', titulo: 'Medio', ancho: '80px' },
  { clave: 'importe', titulo: 'Importe', alineacion: 'derecha' },
  { clave: 'estadoContable', titulo: 'Contable', alineacion: 'centro' },
]

/* Formulario pago */
const mostrarFormularioPago = ref(false)
const formPago = reactive({
  compraId: '',
  proveedorId: '',
  fecha: '',
  importe: 0,
  medio: 'banco' as MedioPago,
  observaciones: '',
})
const intentoPago = ref(false)
const guardandoPago = ref(false)

function fechaInicial(): string {
  const hoy = new Date().toISOString().slice(0, 10)
  const { desde, hasta } = contabilidad.estado.periodo
  if (hoy < desde) return desde
  if (hoy > hasta) return hasta
  return hoy
}

watch(
  () => formPago.compraId,
  (id) => {
    const compra = contabilidad.estado.compras.find((c) => c.id === id)
    if (compra) {
      formPago.proveedorId = compra.proveedorId
      if (!formPago.importe) {
        formPago.importe = saldoPendienteCompra(compra, contabilidad.estado.pagos)
      }
    }
  },
)

const compraPagoSeleccionada = computed(() =>
  contabilidad.estado.compras.find((c) => c.id === formPago.compraId),
)
const saldoPendientePago = computed(() =>
  compraPagoSeleccionada.value
    ? saldoPendienteCompra(compraPagoSeleccionada.value, contabilidad.estado.pagos)
    : 0,
)
const proveedorPagoSeleccionado = computed(() =>
  contabilidad.estado.proveedores.find((p) => p.id === formPago.proveedorId),
)

const comprasPagoOpciones = computed<OpcionSelect[]>(() =>
  contabilidad.estado.compras
    .filter((compra) => saldoPendienteCompra(compra, contabilidad.estado.pagos) > 0)
    .map((compra) => {
      const proveedor = contabilidad.estado.proveedores.find((p) => p.id === compra.proveedorId)
      return {
        valor: compra.id,
        etiqueta: `${compra.numero} · ${proveedor?.nombre ?? ''} · ${formatearMoneda(
          saldoPendienteCompra(compra, contabilidad.estado.pagos),
        )}`,
      }
    }),
)

const mediosPagoOpciones: readonly OpcionSelect[] = MEDIOS_PAGO.map((medio) => ({
  valor: medio,
  etiqueta: etiquetaMedioPago(medio),
}))

const erroresPagoForm = computed<ErroresPago>(() =>
  validarPago(
    {
      compraId: formPago.compraId,
      proveedorId: formPago.proveedorId,
      fecha: formPago.fecha,
      importe: formPago.importe,
      medio: formPago.medio,
      saldoPendiente: saldoPendientePago.value,
    },
    contabilidad.estado.pagos,
  ),
)

function abrirFormularioPago(): void {
  formPago.compraId = ''
  formPago.proveedorId = ''
  formPago.fecha = fechaInicial()
  formPago.importe = 0
  formPago.medio = 'banco'
  formPago.observaciones = ''
  intentoPago.value = false
  mostrarFormularioPago.value = true
}

async function registrarPagoForm(): Promise<void> {
  intentoPago.value = true
  if (hayErroresPago(erroresPagoForm.value)) {
    ui.notificar({
      tipo: 'error',
      titulo: 'Revisá los datos del pago',
      mensaje: 'Hay campos inválidos.',
    })
    return
  }
  const compra = compraPagoSeleccionada.value
  const proveedor = proveedorPagoSeleccionado.value
  if (!compra || !proveedor) return

  guardandoPago.value = true
  const resultado = contabilidad.registrarPago({
    compra,
    proveedor,
    fecha: formPago.fecha as FechaISO,
    importe: formPago.importe,
    medio: formPago.medio,
    observaciones: formPago.observaciones,
  })
  guardandoPago.value = false

  if (!resultado.ok) {
    ui.notificar({
      tipo: 'error',
      titulo: 'No se pudo registrar el pago',
      mensaje: resultado.motivo ?? '',
    })
    return
  }
  ui.notificar({ tipo: 'exito', titulo: 'Pago registrado', mensaje: resultado.pago?.numero ?? '' })
  mostrarFormularioPago.value = false
}

/* -------------------------------------------------------------------------- */
/* Cobros                                                                     */
/* -------------------------------------------------------------------------- */

const filtrosCobro = reactive<FiltrosCobro>(filtrosCobroVacios())
const paginaCobro = ref(1)

const cobrosFiltrados = computed(() =>
  filtrarCobros(
    contabilidad.estado.cobros,
    contabilidad.estado.clientes,
    contabilidad.estado.ventas,
    contabilidad.estado.documentos,
    filtrosCobro,
  ),
)

const totalPaginasCobro = computed(() =>
  Math.max(1, Math.ceil(cobrosFiltrados.value.length / tamanoPagina)),
)

const cobrosPagina = computed(() => {
  const inicio = (paginaCobro.value - 1) * tamanoPagina
  return cobrosFiltrados.value.slice(inicio, inicio + tamanoPagina)
})

watch(
  () => [
    filtrosCobro.texto,
    filtrosCobro.desde,
    filtrosCobro.hasta,
    filtrosCobro.medio,
    filtrosCobro.estadoContable,
  ],
  () => {
    paginaCobro.value = 1
  },
)

const resumenCobros = computed(() =>
  resumirCobros(contabilidad.estado.cobros, contabilidad.estado.documentos),
)

const clientesPorId = computed(
  () => new Map(contabilidad.estado.clientes.map((cliente) => [cliente.id, cliente])),
)
const ventasPorId = computed(
  () => new Map(contabilidad.estado.ventas.map((venta) => [venta.id, venta])),
)

const filasCobros = computed<Record<string, unknown>[]>(() =>
  cobrosPagina.value.map((cobro) => {
    const cliente = clientesPorId.value.get(cobro.clienteId)
    const venta = ventasPorId.value.get(cobro.ventaId)
    const documento = documentosPorId.value.get(cobro.documentoId)
    return {
      id: cobro.id,
      fecha: formatearFecha(cobro.fecha),
      numero: cobro.numero,
      cliente: cliente?.nombre ?? 'Cliente',
      comprobante: venta?.numero ?? '—',
      medio: etiquetaMedioCobro(cobro.medio),
      importe: cobro.importe,
      importeTexto: formatearMoneda(cobro.importe),
      estadoContable: documento?.estado ?? 'pendiente',
    }
  }),
)

const columnasCobros: readonly ColumnaTabla[] = [
  { clave: 'fecha', titulo: 'Fecha', ancho: '92px' },
  { clave: 'numero', titulo: 'Recibo' },
  { clave: 'cliente', titulo: 'Cliente' },
  { clave: 'comprobante', titulo: 'Factura' },
  { clave: 'medio', titulo: 'Medio', ancho: '80px' },
  { clave: 'importe', titulo: 'Importe', alineacion: 'derecha' },
  { clave: 'estadoContable', titulo: 'Contable', alineacion: 'centro' },
]

const mostrarFormularioCobro = ref(false)
const formCobro = reactive({
  ventaId: '',
  clienteId: '',
  fecha: '',
  importe: 0,
  medio: 'banco' as MedioPago,
  observaciones: '',
})
const intentoCobro = ref(false)
const guardandoCobro = ref(false)

watch(
  () => formCobro.ventaId,
  (id) => {
    const venta = contabilidad.estado.ventas.find((v) => v.id === id)
    if (venta) {
      formCobro.clienteId = venta.clienteId
      if (!formCobro.importe) {
        formCobro.importe = saldoPendienteVenta(venta, contabilidad.estado.cobros)
      }
    }
  },
)

const ventaCobroSeleccionada = computed(() =>
  contabilidad.estado.ventas.find((v) => v.id === formCobro.ventaId),
)
const saldoPendienteCobro = computed(() =>
  ventaCobroSeleccionada.value
    ? saldoPendienteVenta(ventaCobroSeleccionada.value, contabilidad.estado.cobros)
    : 0,
)
const clienteCobroSeleccionado = computed(() =>
  contabilidad.estado.clientes.find((c) => c.id === formCobro.clienteId),
)

const ventasCobroOpciones = computed<OpcionSelect[]>(() =>
  contabilidad.estado.ventas
    .filter((venta) => saldoPendienteVenta(venta, contabilidad.estado.cobros) > 0)
    .map((venta) => {
      const cliente = contabilidad.estado.clientes.find((c) => c.id === venta.clienteId)
      return {
        valor: venta.id,
        etiqueta: `${venta.numero} · ${cliente?.nombre ?? ''} · ${formatearMoneda(
          saldoPendienteVenta(venta, contabilidad.estado.cobros),
        )}`,
      }
    }),
)

const mediosCobroOpciones: readonly OpcionSelect[] = MEDIOS_COBRO.map((medio) => ({
  valor: medio,
  etiqueta: etiquetaMedioCobro(medio),
}))

const erroresCobroForm = computed<ErroresCobro>(() =>
  validarCobro(
    {
      ventaId: formCobro.ventaId,
      clienteId: formCobro.clienteId,
      fecha: formCobro.fecha,
      importe: formCobro.importe,
      medio: formCobro.medio,
      saldoPendiente: saldoPendienteCobro.value,
    },
    contabilidad.estado.cobros,
  ),
)

function abrirFormularioCobro(): void {
  formCobro.ventaId = ''
  formCobro.clienteId = ''
  formCobro.fecha = fechaInicial()
  formCobro.importe = 0
  formCobro.medio = 'banco'
  formCobro.observaciones = ''
  intentoCobro.value = false
  mostrarFormularioCobro.value = true
}

async function registrarCobroForm(): Promise<void> {
  intentoCobro.value = true
  if (hayErroresCobro(erroresCobroForm.value)) {
    ui.notificar({
      tipo: 'error',
      titulo: 'Revisá los datos del cobro',
      mensaje: 'Hay campos inválidos.',
    })
    return
  }
  const venta = ventaCobroSeleccionada.value
  const cliente = clienteCobroSeleccionado.value
  if (!venta || !cliente) return

  guardandoCobro.value = true
  const resultado = contabilidad.registrarCobro({
    venta,
    cliente,
    fecha: formCobro.fecha as FechaISO,
    importe: formCobro.importe,
    medio: formCobro.medio,
    observaciones: formCobro.observaciones,
  })
  guardandoCobro.value = false

  if (!resultado.ok) {
    ui.notificar({
      tipo: 'error',
      titulo: 'No se pudo registrar el cobro',
      mensaje: resultado.motivo ?? '',
    })
    return
  }
  ui.notificar({
    tipo: 'exito',
    titulo: 'Cobro registrado',
    mensaje: resultado.cobro?.numero ?? '',
  })
  mostrarFormularioCobro.value = false
}

/* -------------------------------------------------------------------------- */
/* Movimientos y transferencias                                                */
/* -------------------------------------------------------------------------- */

const filtrosMovimiento = reactive<FiltrosTransferencia>(filtrosTransferenciaVacios())
const movimientosFiltrados = computed(() =>
  filtrarTransferencias(
    contabilidad.estado.transferencias,
    contabilidad.estado.documentos,
    filtrosMovimiento,
  ),
)

const saldosTesoreria = computed(() => contabilidad.saldosTesoreria)

const filasMovimientos = computed<Record<string, unknown>[]>(() =>
  [...contabilidad.movimientosTesoreria].map((movimiento) => ({
    id: movimiento.id,
    fecha: formatearFecha(movimiento.fecha),
    descripcion: movimiento.descripcion,
    cuenta: movimiento.cuentaId === CODIGOS.CAJA ? 'Caja' : 'Banco',
    tipo: movimiento.tipo,
    importe: movimiento.importe,
    importeTexto: formatearMoneda(movimiento.importe),
    origen: movimiento.origen,
  })),
)

const mostrarFormularioTransferencia = ref(false)
const formTransferencia = reactive({
  fecha: '',
  cuentaOrigenId: CODIGOS.BANCO,
  cuentaDestinoId: CODIGOS.CAJA,
  importe: 0,
  descripcion: '',
})
const intentoTransferencia = ref(false)
const guardandoTransferencia = ref(false)

const erroresTransferenciaForm = computed<ErroresTransferencia>(() =>
  validarTransferencia(
    {
      cuentaOrigenId: formTransferencia.cuentaOrigenId,
      cuentaDestinoId: formTransferencia.cuentaDestinoId,
      importe: formTransferencia.importe,
      fecha: formTransferencia.fecha,
      descripcion: formTransferencia.descripcion,
    },
    contabilidad.estado.transferencias,
  ),
)

function abrirFormularioTransferencia(): void {
  formTransferencia.fecha = fechaInicial()
  formTransferencia.cuentaOrigenId = CODIGOS.BANCO
  formTransferencia.cuentaDestinoId = CODIGOS.CAJA
  formTransferencia.importe = 0
  formTransferencia.descripcion = 'Reposición de fondo fijo de caja desde banco'
  intentoTransferencia.value = false
  mostrarFormularioTransferencia.value = true
}

async function registrarTransferenciaForm(): Promise<void> {
  intentoTransferencia.value = true
  if (hayErroresTransferencia(erroresTransferenciaForm.value)) {
    ui.notificar({
      tipo: 'error',
      titulo: 'Revisá los datos de la transferencia',
      mensaje: 'Hay campos inválidos.',
    })
    return
  }

  guardandoTransferencia.value = true
  const resultado = contabilidad.registrarTransferencia({
    fecha: formTransferencia.fecha as FechaISO,
    cuentaOrigenId: formTransferencia.cuentaOrigenId,
    cuentaDestinoId: formTransferencia.cuentaDestinoId,
    importe: formTransferencia.importe,
    descripcion: formTransferencia.descripcion,
  })
  guardandoTransferencia.value = false

  if (!resultado.ok) {
    ui.notificar({
      tipo: 'error',
      titulo: 'No se pudo registrar la transferencia',
      mensaje: resultado.motivo ?? '',
    })
    return
  }
  ui.notificar({
    tipo: 'exito',
    titulo: 'Transferencia registrada',
    mensaje: resultado.transferencia?.numero ?? '',
  })
  mostrarFormularioTransferencia.value = false
}

const cuentasTesoreriaOpciones: readonly OpcionSelect[] = CUENTAS_TESORERIA.map((cuenta) => ({
  valor: cuenta,
  etiqueta: cuenta === CODIGOS.CAJA ? 'Caja' : 'Banco',
}))

/* -------------------------------------------------------------------------- */
/* Detalle comprobante (pagos/cobros)                                          */
/* -------------------------------------------------------------------------- */

const pagoDetalleId = ref<string | null>(null)
const cobroDetalleId = ref<string | null>(null)

const pagoDetalle = computed(() =>
  pagoDetalleId.value
    ? (contabilidad.estado.pagos.find((pago) => pago.id === pagoDetalleId.value) ?? null)
    : null,
)
const cobroDetalle = computed(() =>
  cobroDetalleId.value
    ? (contabilidad.estado.cobros.find((cobro) => cobro.id === cobroDetalleId.value) ?? null)
    : null,
)

function abrirDetallePago(id: string): void {
  pagoDetalleId.value = id
}
function cerrarDetallePago(): void {
  pagoDetalleId.value = null
}
function abrirDetalleCobro(id: string): void {
  cobroDetalleId.value = id
}
function cerrarDetalleCobro(): void {
  cobroDetalleId.value = null
}
</script>

<template>
  <section class="page tesoreria">
    <div class="page__header">
      <div>
        <h2>Tesorería</h2>
        <p class="page__lead">
          Administrá pagos, cobros, movimientos de fondos y transferencias de
          {{ empresa.nombreComercial }} durante {{ periodo.etiqueta }}.
        </p>
      </div>
      <div class="page__actions">
        <AppButton v-if="vista === 'pagos'" @click="abrirFormularioPago">
          <Plus :size="16" aria-hidden="true" />
          Nuevo pago
        </AppButton>
        <AppButton v-else-if="vista === 'cobros'" @click="abrirFormularioCobro">
          <Plus :size="16" aria-hidden="true" />
          Nuevo cobro
        </AppButton>
        <AppButton v-else @click="abrirFormularioTransferencia">
          <Plus :size="16" aria-hidden="true" />
          Nueva transferencia
        </AppButton>
      </div>
    </div>

    <AppTabs :tabs="tabs" :model-value="tabActiva" @update:model-value="cambiarVista">
      <!-- PAGOS -->
      <template #panel-pagos>
        <div class="page__section">
          <div class="compras-resumen">
            <article class="compras-resumen__item">
              <span class="compras-resumen__icono"><Receipt :size="17" /></span>
              <span>Pagos</span>
              <strong>{{ resumenPagos.cantidad }}</strong>
              <small>{{ resumenPagos.pendientesRegistracion }} sin registrar</small>
            </article>
            <article class="compras-resumen__item">
              <span class="compras-resumen__icono"><Banknote :size="17" /></span>
              <span>Total pagado</span>
              <strong class="texto-mono">{{ formatearMoneda(resumenPagos.total) }}</strong>
              <small>Obligaciones con proveedores</small>
            </article>
          </div>

          <AppCard compacta>
            <div class="compras-filtros">
              <AppInput
                v-model="filtrosPago.texto"
                label="Buscar"
                type="search"
                placeholder="Proveedor o comprobante"
              />
              <AppInput v-model="filtrosPago.desde" label="Desde" type="date" />
              <AppInput v-model="filtrosPago.hasta" label="Hasta" type="date" />
              <AppSelect
                label="Medio"
                placeholder="Todos"
                :model-value="filtrosPago.medio"
                :opciones="mediosPagoOpciones"
                @update:model-value="(v) => (filtrosPago.medio = v as FiltrosPago['medio'])"
              />
              <div class="compras-filtros__acciones">
                <AppButton
                  variante="secundario"
                  tamano="sm"
                  @click="Object.assign(filtrosPago, filtrosPagoVacios())"
                >
                  <FilterX :size="15" />
                  Limpiar
                </AppButton>
              </div>
            </div>
          </AppCard>

          <AppCard titulo="Pagos registrados" :descripcion="`${pagosFiltrados.length} operaciones`">
            <DataTable
              :columnas="columnasPagos"
              :filas="filasPagos"
              clave-fila="id"
              compacta
              vacio-titulo="Sin pagos"
              vacio-mensaje="Registrá un pago a proveedor."
            >
              <template #celda-importe="{ fila }">
                <span class="texto-mono">{{ fila.importeTexto }}</span>
              </template>
              <template #celda-estadoContable="{ fila }">
                <AppBadge :tipo="fila.estadoContable === 'registrado' ? 'exito' : 'info'">
                  {{ fila.estadoContableTexto }}
                </AppBadge>
              </template>
              <template #celda-acciones="{ fila }">
                <AppButton
                  variante="fantasma"
                  tamano="sm"
                  solo-icono
                  aria-label="Ver detalle"
                  @click="abrirDetallePago(String(fila.id))"
                >
                  <Eye :size="16" />
                </AppButton>
              </template>
            </DataTable>
            <template #pie>
              <AppPagination
                :pagina="paginaPago"
                :total-paginas="totalPaginasPago"
                :total-registros="pagosFiltrados.length"
                etiqueta-registros="pagos"
                @update:pagina="(n) => (paginaPago = n)"
              />
            </template>
          </AppCard>
        </div>
      </template>

      <!-- COBROS -->
      <template #panel-cobros>
        <div class="page__section">
          <div class="compras-resumen">
            <article class="compras-resumen__item">
              <span class="compras-resumen__icono"><Receipt :size="17" /></span>
              <span>Cobros</span>
              <strong>{{ resumenCobros.cantidad }}</strong>
              <small>{{ resumenCobros.pendientesRegistracion }} sin registrar</small>
            </article>
            <article class="compras-resumen__item">
              <span class="compras-resumen__icono"><Banknote :size="17" /></span>
              <span>Total cobrado</span>
              <strong class="texto-mono">{{ formatearMoneda(resumenCobros.total) }}</strong>
              <small>Obligaciones con clientes</small>
            </article>
          </div>

          <AppCard compacta>
            <div class="compras-filtros">
              <AppInput
                v-model="filtrosCobro.texto"
                label="Buscar"
                type="search"
                placeholder="Cliente o comprobante"
              />
              <AppInput v-model="filtrosCobro.desde" label="Desde" type="date" />
              <AppInput v-model="filtrosCobro.hasta" label="Hasta" type="date" />
              <AppSelect
                label="Medio"
                placeholder="Todos"
                :model-value="filtrosCobro.medio"
                :opciones="mediosCobroOpciones"
                @update:model-value="(v) => (filtrosCobro.medio = v as FiltrosCobro['medio'])"
              />
              <div class="compras-filtros__acciones">
                <AppButton
                  variante="secundario"
                  tamano="sm"
                  @click="Object.assign(filtrosCobro, filtrosCobroVacios())"
                >
                  <FilterX :size="15" />
                  Limpiar
                </AppButton>
              </div>
            </div>
          </AppCard>

          <AppCard
            titulo="Cobros registrados"
            :descripcion="`${cobrosFiltrados.length} operaciones`"
          >
            <DataTable
              :columnas="columnasCobros"
              :filas="filasCobros"
              clave-fila="id"
              compacta
              vacio-titulo="Sin cobros"
              vacio-mensaje="Registrá un cobro a cliente."
            >
              <template #celda-importe="{ fila }">
                <span class="texto-mono">{{ fila.importeTexto }}</span>
              </template>
              <template #celda-estadoContable="{ fila }">
                <AppBadge :tipo="fila.estadoContable === 'registrado' ? 'exito' : 'info'">
                  {{ fila.estadoContable }}
                </AppBadge>
              </template>
              <template #celda-acciones="{ fila }">
                <AppButton
                  variante="fantasma"
                  tamano="sm"
                  solo-icono
                  aria-label="Ver detalle"
                  @click="abrirDetalleCobro(String(fila.id))"
                >
                  <Eye :size="16" />
                </AppButton>
              </template>
            </DataTable>
            <template #pie>
              <AppPagination
                :pagina="paginaCobro"
                :total-paginas="totalPaginasCobro"
                :total-registros="cobrosFiltrados.length"
                etiqueta-registros="cobros"
                @update:pagina="(n) => (paginaCobro = n)"
              />
            </template>
          </AppCard>
        </div>
      </template>

      <!-- MOVIMIENTOS -->
      <template #panel-movimientos>
        <div class="page__section">
          <div class="compras-resumen">
            <article
              v-for="saldo in saldosTesoreria"
              :key="saldo.cuentaId"
              class="compras-resumen__item"
            >
              <span class="compras-resumen__icono"><Wallet :size="17" /></span>
              <span>{{ saldo.cuentaId === CODIGOS.CAJA ? 'Caja' : 'Banco' }}</span>
              <strong class="texto-mono">{{ formatearMoneda(saldo.saldoFinal) }}</strong>
              <small
                >Ingresos {{ formatearMoneda(saldo.ingresos) }} · Egresos
                {{ formatearMoneda(saldo.egresos) }}</small
              >
            </article>
          </div>

          <AppCard titulo="Movimientos de fondos" descripcion="Caja, bancos y transferencias.">
            <div class="compras-tabla">
              <table class="ui-tabla ui-tabla--compacta">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Cuenta</th>
                    <th>Tipo</th>
                    <th class="ui-tabla__celda--derecha">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="movimiento in filasMovimientos" :key="movimiento.id as string">
                    <td>{{ movimiento.fecha }}</td>
                    <td>{{ movimiento.descripcion }}</td>
                    <td>{{ movimiento.cuenta }}</td>
                    <td>{{ movimiento.tipo }}</td>
                    <td class="ui-tabla__celda--derecha texto-mono">
                      {{ movimiento.importeTexto }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AppCard>

          <AppCard
            titulo="Transferencias internas"
            :descripcion="`${movimientosFiltrados.length} operaciones`"
          >
            <DataTable
              :columnas="[
                { clave: 'fecha', titulo: 'Fecha' },
                { clave: 'numero', titulo: 'Número' },
                { clave: 'descripcion', titulo: 'Descripción' },
                { clave: 'origen', titulo: 'Origen' },
                { clave: 'destino', titulo: 'Destino' },
                { clave: 'importe', titulo: 'Importe', alineacion: 'derecha' },
              ]"
              :filas="
                movimientosFiltrados.map((t) => ({
                  id: t.id,
                  fecha: formatearFecha(t.fecha),
                  numero: t.numero,
                  descripcion: t.descripcion,
                  origen: t.cuentaOrigenId === CODIGOS.CAJA ? 'Caja' : 'Banco',
                  destino: t.cuentaDestinoId === CODIGOS.CAJA ? 'Caja' : 'Banco',
                  importe: formatearMoneda(t.importe),
                }))
              "
              clave-fila="id"
              compacta
              vacio-titulo="Sin transferencias"
              vacio-mensaje="Registrá una transferencia entre caja y banco."
            />
          </AppCard>
        </div>
      </template>
    </AppTabs>

    <!-- Modal pago -->
    <AppModal
      :model-value="mostrarFormularioPago"
      titulo="Registrar pago"
      tamano="lg"
      @update:model-value="(v) => (mostrarFormularioPago = v)"
    >
      <form class="compras-formulario" @submit.prevent="registrarPagoForm">
        <AppSelect
          id="pago-compra"
          v-model="formPago.compraId"
          label="Factura a pagar"
          placeholder="Seleccionar factura"
          :opciones="comprasPagoOpciones"
          :error="intentoPago ? erroresPagoForm.compraId : undefined"
          required
        />
        <AppInput
          id="pago-fecha"
          v-model="formPago.fecha"
          label="Fecha"
          type="date"
          :error="intentoPago ? erroresPagoForm.fecha : undefined"
          required
        />
        <CurrencyInput
          id="pago-importe"
          v-model="formPago.importe"
          label="Importe"
          :error="intentoPago ? erroresPagoForm.importe : undefined"
          required
        />
        <div class="texto-suave">Saldo pendiente: {{ formatearMoneda(saldoPendientePago) }}</div>
        <AppSelect
          id="pago-medio"
          v-model="formPago.medio"
          label="Medio"
          :opciones="mediosPagoOpciones"
          :error="intentoPago ? erroresPagoForm.medio : undefined"
          required
        />
        <AppInput id="pago-obs" v-model="formPago.observaciones" label="Observaciones" />
        <div class="compras-formulario__acciones">
          <AppButton variante="secundario" @click="mostrarFormularioPago = false"
            >Cancelar</AppButton
          >
          <AppButton type="submit" :cargando="guardandoPago">
            <FileText :size="16" />
            Registrar pago
          </AppButton>
        </div>
      </form>
    </AppModal>

    <!-- Modal cobro -->
    <AppModal
      :model-value="mostrarFormularioCobro"
      titulo="Registrar cobro"
      tamano="lg"
      @update:model-value="(v) => (mostrarFormularioCobro = v)"
    >
      <form class="compras-formulario" @submit.prevent="registrarCobroForm">
        <AppSelect
          id="cobro-venta"
          v-model="formCobro.ventaId"
          label="Factura a cobrar"
          placeholder="Seleccionar factura"
          :opciones="ventasCobroOpciones"
          :error="intentoCobro ? erroresCobroForm.ventaId : undefined"
          required
        />
        <AppInput
          id="cobro-fecha"
          v-model="formCobro.fecha"
          label="Fecha"
          type="date"
          :error="intentoCobro ? erroresCobroForm.fecha : undefined"
          required
        />
        <CurrencyInput
          id="cobro-importe"
          v-model="formCobro.importe"
          label="Importe"
          :error="intentoCobro ? erroresCobroForm.importe : undefined"
          required
        />
        <div class="texto-suave">Saldo pendiente: {{ formatearMoneda(saldoPendienteCobro) }}</div>
        <AppSelect
          id="cobro-medio"
          v-model="formCobro.medio"
          label="Medio"
          :opciones="mediosCobroOpciones"
          :error="intentoCobro ? erroresCobroForm.medio : undefined"
          required
        />
        <AppInput id="cobro-obs" v-model="formCobro.observaciones" label="Observaciones" />
        <div class="compras-formulario__acciones">
          <AppButton variante="secundario" @click="mostrarFormularioCobro = false"
            >Cancelar</AppButton
          >
          <AppButton type="submit" :cargando="guardandoCobro">
            <FileText :size="16" />
            Registrar cobro
          </AppButton>
        </div>
      </form>
    </AppModal>

    <!-- Modal transferencia -->
    <AppModal
      :model-value="mostrarFormularioTransferencia"
      titulo="Registrar transferencia"
      tamano="lg"
      @update:model-value="(v) => (mostrarFormularioTransferencia = v)"
    >
      <form class="compras-formulario" @submit.prevent="registrarTransferenciaForm">
        <AppInput
          id="trans-fecha"
          v-model="formTransferencia.fecha"
          label="Fecha"
          type="date"
          :error="intentoTransferencia ? erroresTransferenciaForm.fecha : undefined"
          required
        />
        <AppSelect
          id="trans-origen"
          v-model="formTransferencia.cuentaOrigenId"
          label="Cuenta origen"
          :opciones="cuentasTesoreriaOpciones"
          :error="intentoTransferencia ? erroresTransferenciaForm.cuentaOrigenId : undefined"
          required
        />
        <AppSelect
          id="trans-destino"
          v-model="formTransferencia.cuentaDestinoId"
          label="Cuenta destino"
          :opciones="cuentasTesoreriaOpciones"
          :error="intentoTransferencia ? erroresTransferenciaForm.cuentaDestinoId : undefined"
          required
        />
        <CurrencyInput
          id="trans-importe"
          v-model="formTransferencia.importe"
          label="Importe"
          :error="intentoTransferencia ? erroresTransferenciaForm.importe : undefined"
          required
        />
        <AppInput
          id="trans-desc"
          v-model="formTransferencia.descripcion"
          label="Descripción"
          :error="intentoTransferencia ? erroresTransferenciaForm.descripcion : undefined"
          required
        />
        <div class="compras-formulario__acciones">
          <AppButton variante="secundario" @click="mostrarFormularioTransferencia = false"
            >Cancelar</AppButton
          >
          <AppButton type="submit" :cargando="guardandoTransferencia">
            <ArrowRightLeft :size="16" />
            Registrar transferencia
          </AppButton>
        </div>
      </form>
    </AppModal>

    <!-- Modal detalle pago -->
    <AppModal
      :model-value="Boolean(pagoDetalle)"
      titulo="Detalle de pago"
      @update:model-value="(v) => !v && cerrarDetallePago()"
    >
      <div v-if="pagoDetalle">
        <p>{{ pagoDetalle.numero }} · {{ formatearMoneda(pagoDetalle.importe) }}</p>
      </div>
    </AppModal>

    <!-- Modal detalle cobro -->
    <AppModal
      :model-value="Boolean(cobroDetalle)"
      titulo="Detalle de cobro"
      @update:model-value="(v) => !v && cerrarDetalleCobro()"
    >
      <div v-if="cobroDetalle">
        <p>{{ cobroDetalle.numero }} · {{ formatearMoneda(cobroDetalle.importe) }}</p>
      </div>
    </AppModal>
  </section>
</template>
