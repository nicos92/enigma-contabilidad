<script setup lang="ts">
import {
  CalendarDays,
  ChartColumn,
  Download,
  Percent,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
  Trophy,
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import DataTable from '@/components/ui/DataTable.vue'
import type { ColumnaTabla, TabItem } from '@/components/ui/tipos'
import { formatearMoneda } from '@/core/dinero'
import {
  construirInformePeriodo,
  descargarCsv,
  generarCsvInforme,
  nombreArchivoInforme,
  type RangoInforme,
  type TipoInformeCsv,
} from '@/core/informes'
import { useContabilidadStore } from '@/stores/contabilidad'
import { useUiStore } from '@/stores/ui'
import type { FechaISO } from '@/types'

type VistaInformes = TipoInformeCsv

const VISTAS: readonly VistaInformes[] = [
  'ventas-clientes',
  'compras-proveedores',
  'iva',
  'top-productos',
]

const contabilidad = useContabilidadStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const vista = computed<VistaInformes>(() => {
  const valor = route.query.vista
  return VISTAS.find((actual) => actual === valor) ?? 'ventas-clientes'
})

const tabs: TabItem[] = [
  { id: 'ventas-clientes', etiqueta: 'Ventas por cliente' },
  { id: 'compras-proveedores', etiqueta: 'Compras por proveedor' },
  { id: 'iva', etiqueta: 'IVA del período' },
  { id: 'top-productos', etiqueta: 'Top de productos' },
]

function cambiarVista(id: string): void {
  void router.push({ name: 'informes', query: { ...route.query, vista: id } })
}

/* -------------------------------------------------------------------------- */
/* Filtro por período                                                         */
/* -------------------------------------------------------------------------- */

const desde = ref<string>(contabilidad.estado.periodo.desde)
const hasta = ref<string>(contabilidad.estado.periodo.hasta)

watch(
  () => [contabilidad.estado.periodo.desde, contabilidad.estado.periodo.hasta] as const,
  ([nuevoDesde, nuevoHasta]) => {
    desde.value = nuevoDesde
    hasta.value = nuevoHasta
  },
)

const errorRango = computed(() => {
  if (!desde.value || !hasta.value) return 'Ingresá la fecha de inicio y de fin del período.'
  if (desde.value > hasta.value) return 'La fecha desde no puede ser posterior a la fecha hasta.'
  return ''
})

const rango = computed<RangoInforme | null>(() => {
  if (errorRango.value) return null
  return { desde: desde.value as FechaISO, hasta: hasta.value as FechaISO }
})

function restablecerPeriodo(): void {
  desde.value = contabilidad.estado.periodo.desde
  hasta.value = contabilidad.estado.periodo.hasta
  ui.notificar({
    tipo: 'info',
    titulo: 'Período restablecido',
    mensaje: `Se muestran las operaciones de ${contabilidad.estado.periodo.etiqueta}.`,
  })
}

/* -------------------------------------------------------------------------- */
/* Informe consolidado                                                        */
/* -------------------------------------------------------------------------- */

const informe = computed(() =>
  rango.value ? construirInformePeriodo(contabilidad.estado, rango.value) : null,
)

const ventas = computed(() => informe.value?.ventasPorCliente)
const compras = computed(() => informe.value?.comprasPorProveedores)
const iva = computed(() => informe.value?.iva)
const topProductos = computed(() => informe.value?.topProductos)

const saldoIva = computed(() => iva.value?.saldo ?? 0)
const saldoIvaEtiqueta = computed(() =>
  saldoIva.value > 0
    ? `A pagar ${formatearMoneda(saldoIva.value)}`
    : saldoIva.value < 0
      ? `Saldo a favor ${formatearMoneda(Math.abs(saldoIva.value))}`
      : 'Sin diferencia',
)

const topProducto = computed(() => topProductos.value?.filas[0] ?? null)

const resumen = computed(() => [
  {
    clave: 'ventas',
    etiqueta: 'Ventas registradas',
    valor: formatearMoneda(ventas.value?.totales.total ?? 0),
    detalle: `${ventas.value?.totales.operaciones ?? 0} facturas emitidas`,
  },
  {
    clave: 'compras',
    etiqueta: 'Compras registradas',
    valor: formatearMoneda(compras.value?.totales.total ?? 0),
    detalle: `${compras.value?.totales.operaciones ?? 0} facturas recibidas`,
  },
  {
    clave: 'iva',
    etiqueta: 'Posición de IVA',
    valor: saldoIvaEtiqueta.value,
    detalle: `Débito ${formatearMoneda(iva.value?.ivaDebito ?? 0)} · Crédito ${formatearMoneda(iva.value?.ivaCredito ?? 0)}`,
  },
  {
    clave: 'top',
    etiqueta: 'Producto líder',
    valor: topProducto.value?.nombre ?? 'Sin ventas registradas',
    detalle: topProducto.value
      ? `${formatearMoneda(topProducto.value.subtotal)} netos · ${topProducto.value.cantidad} unidades`
      : 'Ajustá el período para ver resultados',
  },
])

/* -------------------------------------------------------------------------- */
/* Tablas                                                                     */
/* -------------------------------------------------------------------------- */

const columnasVentas: readonly ColumnaTabla[] = [
  { clave: 'cliente', titulo: 'Cliente' },
  { clave: 'operaciones', titulo: 'Facturas', alineacion: 'centro', ancho: '84px' },
  { clave: 'subtotal', titulo: 'Subtotal', alineacion: 'derecha' },
  { clave: 'iva', titulo: 'IVA', alineacion: 'derecha' },
  { clave: 'total', titulo: 'Total', alineacion: 'derecha' },
  { clave: 'cobrado', titulo: 'Cobrado', alineacion: 'derecha' },
  { clave: 'saldo', titulo: 'Saldo', alineacion: 'derecha' },
]

const filasVentas = computed<Record<string, unknown>[]>(() =>
  (ventas.value?.filas ?? []).map((fila) => ({
    clienteId: fila.clienteId,
    cliente: fila.cliente,
    operaciones: fila.operaciones,
    subtotal: formatearMoneda(fila.subtotal),
    iva: formatearMoneda(fila.iva),
    total: formatearMoneda(fila.total),
    cobrado: formatearMoneda(fila.cobrado),
    saldo: formatearMoneda(fila.saldo),
  })),
)

const columnasCompras: readonly ColumnaTabla[] = [
  { clave: 'proveedor', titulo: 'Proveedor' },
  { clave: 'operaciones', titulo: 'Facturas', alineacion: 'centro', ancho: '84px' },
  { clave: 'subtotal', titulo: 'Subtotal', alineacion: 'derecha' },
  { clave: 'iva', titulo: 'IVA', alineacion: 'derecha' },
  { clave: 'total', titulo: 'Total', alineacion: 'derecha' },
  { clave: 'pagado', titulo: 'Pagado', alineacion: 'derecha' },
  { clave: 'saldo', titulo: 'Saldo', alineacion: 'derecha' },
]

const filasCompras = computed<Record<string, unknown>[]>(() =>
  (compras.value?.filas ?? []).map((fila) => ({
    proveedorId: fila.proveedorId,
    proveedor: fila.proveedor,
    operaciones: fila.operaciones,
    subtotal: formatearMoneda(fila.subtotal),
    iva: formatearMoneda(fila.iva),
    total: formatearMoneda(fila.total),
    pagado: formatearMoneda(fila.pagado),
    saldo: formatearMoneda(fila.saldo),
  })),
)

const columnasIva: readonly ColumnaTabla[] = [
  { clave: 'alicuota', titulo: 'Alícuota', alineacion: 'centro', ancho: '96px' },
  { clave: 'baseVentas', titulo: 'Base ventas', alineacion: 'derecha' },
  { clave: 'ivaDebito', titulo: 'IVA débito', alineacion: 'derecha' },
  { clave: 'baseCompras', titulo: 'Base compras', alineacion: 'derecha' },
  { clave: 'ivaCredito', titulo: 'IVA crédito', alineacion: 'derecha' },
]

const filasIva = computed<Record<string, unknown>[]>(() =>
  (iva.value?.filas ?? []).map((fila) => ({
    alicuota: `${fila.alicuota}%`,
    baseVentas: formatearMoneda(fila.baseVentas),
    ivaDebito: formatearMoneda(fila.ivaDebito),
    baseCompras: formatearMoneda(fila.baseCompras),
    ivaCredito: formatearMoneda(fila.ivaCredito),
  })),
)

const columnasTop: readonly ColumnaTabla[] = [
  { clave: 'puesto', titulo: '#', alineacion: 'centro', ancho: '52px' },
  { clave: 'codigo', titulo: 'Código', ancho: '120px' },
  { clave: 'nombre', titulo: 'Producto o servicio' },
  { clave: 'cantidad', titulo: 'Cantidad', alineacion: 'derecha' },
  { clave: 'operaciones', titulo: 'Operaciones', alineacion: 'centro' },
  { clave: 'subtotal', titulo: 'Ventas netas', alineacion: 'derecha' },
  { clave: 'participacion', titulo: 'Participación', alineacion: 'derecha' },
]

const formatoPorcentaje = new Intl.NumberFormat('es-AR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const filasTop = computed<Record<string, unknown>[]>(() =>
  (topProductos.value?.filas ?? []).map((fila, indice) => ({
    productoId: fila.productoId,
    puesto: indice + 1,
    codigo: fila.codigo,
    nombre: fila.nombre,
    cantidad: fila.cantidad,
    operaciones: fila.operaciones,
    subtotal: formatearMoneda(fila.subtotal),
    participacion: formatoPorcentaje.format(fila.participacion),
  })),
)

/* -------------------------------------------------------------------------- */
/* Exportación CSV                                                            */
/* -------------------------------------------------------------------------- */

function exportar(tipo: TipoInformeCsv): void {
  if (!informe.value) {
    ui.notificar({
      tipo: 'error',
      titulo: 'No se puede exportar',
      mensaje: errorRango.value,
    })
    return
  }

  const contenido = generarCsvInforme(tipo, informe.value)
  const descargado = descargarCsv(nombreArchivoInforme(tipo, informe.value.rango), contenido)

  if (!descargado) {
    ui.notificar({
      tipo: 'error',
      titulo: 'No se pudo descargar el CSV',
      mensaje: 'El navegador no permitió generar el archivo. Probá desde otro navegador.',
    })
    return
  }

  ui.notificar({
    tipo: 'exito',
    titulo: 'CSV generado',
    mensaje: `Se descargó ${nombreArchivoInforme(tipo, informe.value.rango)}.`,
  })
}
</script>

<template>
  <section class="page informes">
    <div class="page__header">
      <div>
        <h2>Informes</h2>
        <p class="page__lead">
          Reportes del período derivados de las operaciones registradas. Las facturas pendientes de
          registración no alteran los totales hasta que Contaduría las aprueba.
        </p>
      </div>
      <div class="page__actions">
        <AppBadge tipo="marca" punto>{{ contabilidad.estado.periodo.etiqueta }}</AppBadge>
        <AppBadge tipo="info">Solo operaciones registradas</AppBadge>
      </div>
    </div>

    <AppCard
      titulo="Filtro por período"
      descripcion="Los reportes incluyen las operaciones cuya fecha está comprendida entre ambos extremos."
    >
      <div class="informes-filtros">
        <AppInput v-model="desde" label="Desde" type="date" />
        <AppInput v-model="hasta" label="Hasta" type="date" />
        <div class="informes-filtros__acciones">
          <AppButton variante="secundario" @click="restablecerPeriodo">
            <RotateCcw :size="16" aria-hidden="true" />
            Restablecer período
          </AppButton>
        </div>
      </div>
      <p v-if="errorRango" class="informes-filtros__error" role="alert">
        {{ errorRango }}
      </p>
      <p v-else class="informes-filtros__ayuda">
        <CalendarDays :size="15" aria-hidden="true" />
        Mostrando operaciones desde el {{ desde }} hasta el {{ hasta }}.
      </p>
    </AppCard>

    <div class="informes-resumen">
      <article v-for="item in resumen" :key="item.clave" class="informes-resumen__item">
        <span>{{ item.etiqueta }}</span>
        <strong>{{ item.valor }}</strong>
        <small>{{ item.detalle }}</small>
      </article>
    </div>

    <AppTabs :tabs="tabs" :model-value="vista" @update:model-value="cambiarVista">
      <template #panel-ventas-clientes>
        <AppCard
          titulo="Ventas por cliente"
          descripcion="Facturación registrada, cobros aplicados y saldo pendiente por cliente."
        >
          <template #acciones>
            <AppButton variante="secundario" tamano="sm" @click="exportar('ventas-clientes')">
              <Download :size="15" aria-hidden="true" />
              Exportar CSV
            </AppButton>
          </template>

          <DataTable
            :columnas="columnasVentas"
            :filas="filasVentas"
            clave-fila="clienteId"
            titulo="Ventas por cliente"
            vacio-titulo="Sin ventas registradas"
            vacio-mensaje="No hay facturas emitidas y registradas dentro del período seleccionado."
          />

          <div v-if="ventas && ventas.filas.length > 0" class="informes-totales">
            <span
              ><ReceiptText :size="15" aria-hidden="true" />
              {{ ventas.totales.operaciones }} facturas</span
            >
            <span
              >Subtotal <strong>{{ formatearMoneda(ventas.totales.subtotal) }}</strong></span
            >
            <span
              >IVA <strong>{{ formatearMoneda(ventas.totales.iva) }}</strong></span
            >
            <span
              >Total <strong>{{ formatearMoneda(ventas.totales.total) }}</strong></span
            >
            <span
              >Cobrado <strong>{{ formatearMoneda(ventas.totales.cobrado) }}</strong></span
            >
            <span
              >Saldo <strong>{{ formatearMoneda(ventas.totales.saldo) }}</strong></span
            >
          </div>
        </AppCard>
      </template>

      <template #panel-compras-proveedores>
        <AppCard
          titulo="Compras por proveedor"
          descripcion="Facturación recibida registrada, pagos aplicados y saldo pendiente por proveedor."
        >
          <template #acciones>
            <AppButton variante="secundario" tamano="sm" @click="exportar('compras-proveedores')">
              <Download :size="15" aria-hidden="true" />
              Exportar CSV
            </AppButton>
          </template>

          <DataTable
            :columnas="columnasCompras"
            :filas="filasCompras"
            clave-fila="proveedorId"
            titulo="Compras por proveedor"
            vacio-titulo="Sin compras registradas"
            vacio-mensaje="No hay facturas recibidas y registradas dentro del período seleccionado."
          />

          <div v-if="compras && compras.filas.length > 0" class="informes-totales">
            <span
              ><ShoppingCart :size="15" aria-hidden="true" />
              {{ compras.totales.operaciones }} facturas</span
            >
            <span
              >Subtotal <strong>{{ formatearMoneda(compras.totales.subtotal) }}</strong></span
            >
            <span
              >IVA <strong>{{ formatearMoneda(compras.totales.iva) }}</strong></span
            >
            <span
              >Total <strong>{{ formatearMoneda(compras.totales.total) }}</strong></span
            >
            <span
              >Pagado <strong>{{ formatearMoneda(compras.totales.pagado) }}</strong></span
            >
            <span
              >Saldo <strong>{{ formatearMoneda(compras.totales.saldo) }}</strong></span
            >
          </div>
        </AppCard>
      </template>

      <template #panel-iva>
        <AppCard
          titulo="IVA del período"
          descripcion="Débito fiscal de ventas, crédito fiscal de compras y posición resultante."
        >
          <template #acciones>
            <AppButton variante="secundario" tamano="sm" @click="exportar('iva')">
              <Download :size="15" aria-hidden="true" />
              Exportar CSV
            </AppButton>
          </template>

          <div v-if="iva" class="informes-iva">
            <div class="informes-iva__dato">
              <span>IVA débito fiscal</span>
              <strong>{{ formatearMoneda(iva.ivaDebito) }}</strong>
              <small>Base {{ formatearMoneda(iva.baseVentas) }}</small>
            </div>
            <div class="informes-iva__dato">
              <span>IVA crédito fiscal</span>
              <strong>{{ formatearMoneda(iva.ivaCredito) }}</strong>
              <small>Base {{ formatearMoneda(iva.baseCompras) }}</small>
            </div>
            <div
              class="informes-iva__dato"
              :class="{ 'informes-iva__dato--destacado': iva.saldo !== 0 }"
            >
              <span>{{ iva.saldo >= 0 ? 'IVA a pagar' : 'Saldo a favor' }}</span>
              <strong>{{ formatearMoneda(Math.abs(iva.saldo)) }}</strong>
              <small>{{ iva.saldo === 0 ? 'Sin diferencia' : 'Posición del período' }}</small>
            </div>
          </div>

          <DataTable
            :columnas="columnasIva"
            :filas="filasIva"
            clave-fila="alicuota"
            titulo="IVA por alícuota"
            vacio-titulo="Sin IVA registrado"
            vacio-mensaje="No hay operaciones alcanzadas por IVA dentro del período seleccionado."
          />
        </AppCard>
      </template>

      <template #panel-top-productos>
        <AppCard
          titulo="Top de productos"
          descripcion="Ranking por ventas netas registradas en el período. Incluye productos y servicios."
        >
          <template #acciones>
            <AppButton variante="secundario" tamano="sm" @click="exportar('top-productos')">
              <Download :size="15" aria-hidden="true" />
              Exportar CSV
            </AppButton>
          </template>

          <DataTable
            :columnas="columnasTop"
            :filas="filasTop"
            clave-fila="productoId"
            titulo="Top de productos"
            vacio-titulo="Sin productos vendidos"
            vacio-mensaje="No hay líneas de venta registradas dentro del período seleccionado."
          />

          <div v-if="topProductos && topProductos.filas.length > 0" class="informes-totales">
            <span
              ><Trophy :size="15" aria-hidden="true" /> {{ topProductos.filas.length }} productos
              con ventas</span
            >
            <span
              >Cantidad <strong>{{ topProductos.cantidadTotal }}</strong></span
            >
            <span
              >Ventas netas <strong>{{ formatearMoneda(topProductos.ventasNetas) }}</strong></span
            >
          </div>
        </AppCard>
      </template>
    </AppTabs>

    <p class="informes-nota">
      <ChartColumn :size="15" aria-hidden="true" />
      <Percent :size="15" aria-hidden="true" />
      Los importes se expresan en pesos y se calculan con los mismos redondeos que los asientos
      contables. El CSV respeta los filtros aplicados.
    </p>
  </section>
</template>
