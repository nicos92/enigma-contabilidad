<script setup lang="ts">
import { CheckCircle2, Eye, FilterX, RotateCcw, XCircle } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import DataTable from '@/components/ui/DataTable.vue'
import PlanCuentasNodo from '@/components/contaduria/PlanCuentasNodo.vue'
import type { ColumnaTabla, OpcionSelect, TabItem, TipoBadge } from '@/components/ui/tipos'
import {
  construirArbolCuentas,
  etiquetaEstadoDocumento,
  etiquetaOrigenDocumento,
  etiquetaTipoDocumento,
  filtrarAsientos,
  filtrarDocumentos,
  filtrosAsientoVacios,
  filtrosDocumentoVacios,
  tipoBadgeEstadoDocumento,
  cuentasDelAsiento,
  type FiltrosAsiento,
  type FiltrosDocumento,
} from '@/core/contaduria'
import { formatearFecha, formatearMoneda } from '@/core/dinero'
import { useContabilidadStore } from '@/stores/contabilidad'
import { useUiStore } from '@/stores/ui'
import type { Asiento, DocumentoContable } from '@/types/contabilidad'

const contabilidad = useContabilidadStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

type VistaContaduria = 'bandeja' | 'asientos' | 'plan-cuentas'

const vista = computed<VistaContaduria>(() => {
  const v = route.query.vista
  if (v === 'asientos') return 'asientos'
  if (v === 'plan-cuentas') return 'plan-cuentas'
  return 'bandeja'
})

function cambiarVista(id: string): void {
  void router.push({ name: 'contaduria', query: { vista: id } })
}

const tabs: TabItem[] = [
  { id: 'bandeja', etiqueta: 'Bandeja de documentos' },
  { id: 'asientos', etiqueta: 'Asientos contables' },
  { id: 'plan-cuentas', etiqueta: 'Plan de cuentas' },
]

const tabActiva = computed(() => vista.value)

/* -------------------------------------------------------------------------- */
/* Bandeja                                                                    */
/* -------------------------------------------------------------------------- */

const filtrosDoc = reactive<FiltrosDocumento>(filtrosDocumentoVacios())
const paginaDoc = ref(1)
const tamanoPagina = 8

const documentosFiltrados = computed(() =>
  filtrarDocumentos(contabilidad.estado.documentos, filtrosDoc),
)

const totalPaginasDoc = computed(() =>
  Math.max(1, Math.ceil(documentosFiltrados.value.length / tamanoPagina)),
)

const documentosPagina = computed(() => {
  const inicio = (paginaDoc.value - 1) * tamanoPagina
  return documentosFiltrados.value.slice(inicio, inicio + tamanoPagina)
})

watch(
  () => [
    filtrosDoc.texto,
    filtrosDoc.origen,
    filtrosDoc.estado,
    filtrosDoc.desde,
    filtrosDoc.hasta,
  ],
  () => {
    paginaDoc.value = 1
  },
)

watch(totalPaginasDoc, (total) => {
  if (paginaDoc.value > total) paginaDoc.value = total
})

const opcionesOrigen: readonly OpcionSelect[] = [
  { valor: 'compras', etiqueta: 'Compras' },
  { valor: 'ventas', etiqueta: 'Ventas' },
  { valor: 'tesoreria', etiqueta: 'Tesorería' },
  { valor: 'contaduria', etiqueta: 'Contaduría' },
  { valor: 'apertura', etiqueta: 'Apertura' },
]

const opcionesEstadoDoc: readonly OpcionSelect[] = [
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'en_revision', etiqueta: 'En revisión' },
  { valor: 'aprobado', etiqueta: 'Aprobado' },
  { valor: 'registrado', etiqueta: 'Registrado' },
  { valor: 'observado', etiqueta: 'Observado' },
]

const columnasBandeja: readonly ColumnaTabla[] = [
  { clave: 'fecha', titulo: 'Fecha', ancho: '92px' },
  { clave: 'numero', titulo: 'Documento' },
  { clave: 'tipo', titulo: 'Tipo' },
  { clave: 'origen', titulo: 'Origen', ancho: '100px' },
  { clave: 'contraparte', titulo: 'Cliente/Proveedor' },
  { clave: 'importe', titulo: 'Importe', alineacion: 'derecha' },
  { clave: 'estado', titulo: 'Estado', alineacion: 'centro' },
  { clave: 'acciones', titulo: '', alineacion: 'derecha', ancho: '96px' },
]

const filasBandeja = computed<Record<string, unknown>[]>(() =>
  documentosPagina.value.map((documento) => ({
    id: documento.id,
    fecha: formatearFecha(documento.fecha),
    numero: documento.numero,
    tipo: etiquetaTipoDocumento(documento.tipo),
    origen: etiquetaOrigenDocumento(documento.origen),
    contraparte: documento.contraparte ?? '—',
    importe: documento.importe,
    importeTexto: formatearMoneda(documento.importe),
    estado: etiquetaEstadoDocumento(documento.estado),
    estadoRaw: documento.estado,
    tipoBadge: tipoBadgeEstadoDocumento(documento.estado),
  })),
)

/* -------------------------------------------------------------------------- */
/* Detalle de documento                                                       */
/* -------------------------------------------------------------------------- */

const documentoSeleccionadoId = ref<string | null>(null)

const documentoSeleccionado = computed<DocumentoContable | null>(() =>
  documentoSeleccionadoId.value
    ? (contabilidad.estado.documentos.find((d) => d.id === documentoSeleccionadoId.value) ?? null)
    : null,
)

const asientoSeleccionadoDoc = computed<Asiento | null>(() =>
  documentoSeleccionado.value
    ? (contabilidad.estado.asientos.find((a) => a.id === documentoSeleccionado.value!.asientoId) ??
      null)
    : null,
)

// Comercial info
const operacionComercial = computed(() => {
  const doc = documentoSeleccionado.value
  if (!doc?.operacionId) return null
  if (doc.origen === 'compras') {
    return contabilidad.estado.compras.find((c) => c.id === doc.operacionId) ?? null
  }
  if (doc.origen === 'ventas') {
    return contabilidad.estado.ventas.find((v) => v.id === doc.operacionId) ?? null
  }
  if (doc.origen === 'tesoreria') {
    const pago = contabilidad.estado.pagos.find((p) => p.id === doc.operacionId)
    if (pago) return { tipo: 'pago', data: pago }
    const cobro = contabilidad.estado.cobros.find((c) => c.id === doc.operacionId)
    if (cobro) return { tipo: 'cobro', data: cobro }
    const transferencia = contabilidad.estado.transferencias.find((t) => t.id === doc.operacionId)
    if (transferencia) return { tipo: 'transferencia', data: transferencia }
  }
  return null
})

const motivoObservacion = ref('')
const mostrarModalObservar = ref(false)
const documentoAObservar = ref<string | null>(null)

function abrirDetalleDocumento(id: string): void {
  documentoSeleccionadoId.value = id
  void router.push({ name: 'contaduria', query: { vista: 'bandeja', documento: id } })
}

function cerrarDetalleDocumento(): void {
  documentoSeleccionadoId.value = null
  void router.push({ name: 'contaduria', query: { vista: 'bandeja' } })
}

function solicitarObservacion(id: string): void {
  documentoAObservar.value = id
  motivoObservacion.value = ''
  mostrarModalObservar.value = true
}

function confirmarObservacion(): void {
  if (!documentoAObservar.value) return
  const resultado = contabilidad.observarDocumento(
    documentoAObservar.value,
    motivoObservacion.value,
  )
  mostrarModalObservar.value = false
  if (resultado.ok) {
    ui.notificar({ titulo: 'Documento observado', tipo: 'advertencia' })
  } else {
    ui.notificar({ titulo: 'No se pudo observar el documento', tipo: 'error' })
  }
  documentoAObservar.value = null
}

function aprobarYRegistrar(id: string): void {
  const resultado = contabilidad.aprobarDocumento(id)
  if (resultado.ok) {
    if (resultado.duplicado) {
      ui.notificar({ titulo: 'El documento ya estaba registrado', tipo: 'info' })
    } else {
      ui.notificar({ titulo: 'Asiento registrado correctamente', tipo: 'exito' })
    }
  } else {
    ui.notificar({ titulo: 'No se pudo registrar el documento', tipo: 'error' })
  }
}

function reabrir(id: string): void {
  const resultado = contabilidad.reabrirDocumento(id)
  if (resultado.ok) {
    ui.notificar({ titulo: 'Documento reabierto', tipo: 'exito' })
  } else {
    ui.notificar({ titulo: 'No se pudo reabrir el documento', tipo: 'error' })
  }
}

function ponerEnRevision(id: string): void {
  const resultado = contabilidad.ponerEnRevision(id)
  if (resultado.ok) {
    ui.notificar({ titulo: 'Documento en revisión', tipo: 'exito' })
  }
}

// sync with query
watch(
  () => route.query.documento,
  (valor) => {
    if (typeof valor === 'string') documentoSeleccionadoId.value = valor
  },
  { immediate: true },
)

// asientoSeleccionadoId se sincroniza más abajo, una vez declarado.

/* -------------------------------------------------------------------------- */
/* Asientos                                                                   */
/* -------------------------------------------------------------------------- */

const filtrosAsiento = reactive<FiltrosAsiento>(filtrosAsientoVacios())
const paginaAsiento = ref(1)

const asientosFiltrados = computed(() =>
  filtrarAsientos(contabilidad.estado.asientos, contabilidad.estado.documentos, filtrosAsiento),
)

const totalPaginasAsiento = computed(() =>
  Math.max(1, Math.ceil(asientosFiltrados.value.length / tamanoPagina)),
)

const asientosPagina = computed(() => {
  const inicio = (paginaAsiento.value - 1) * tamanoPagina
  return asientosFiltrados.value.slice(inicio, inicio + tamanoPagina)
})

watch(
  () => [
    filtrosAsiento.texto,
    filtrosAsiento.origen,
    filtrosAsiento.estado,
    filtrosAsiento.desde,
    filtrosAsiento.hasta,
    filtrosAsiento.cuenta,
  ],
  () => {
    paginaAsiento.value = 1
  },
)

watch(totalPaginasAsiento, (total) => {
  if (paginaAsiento.value > total) paginaAsiento.value = total
})

const opcionesOrigenAsiento: readonly OpcionSelect[] = [
  { valor: 'compra', etiqueta: 'Compra' },
  { valor: 'venta', etiqueta: 'Venta' },
  { valor: 'pago', etiqueta: 'Pago' },
  { valor: 'cobro', etiqueta: 'Cobro' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'apertura', etiqueta: 'Apertura' },
  { valor: 'amortizacion', etiqueta: 'Amortización' },
  { valor: 'ajuste', etiqueta: 'Ajuste' },
  { valor: 'impuesto', etiqueta: 'Impuesto' },
]

const opcionesEstadoAsiento: readonly OpcionSelect[] = [
  { valor: 'propuesto', etiqueta: 'Propuesto' },
  { valor: 'registrado', etiqueta: 'Registrado' },
  { valor: 'anulado', etiqueta: 'Anulado' },
]

const opcionesCuenta: readonly OpcionSelect[] = contabilidad.estado.cuentas
  .filter((c) => c.imputable)
  .map((c) => ({ valor: c.codigo, etiqueta: `${c.codigo} - ${c.nombre}` }))

const columnasAsientos: readonly ColumnaTabla[] = [
  { clave: 'numero', titulo: 'Nº', ancho: '60px' },
  { clave: 'fecha', titulo: 'Fecha', ancho: '92px' },
  { clave: 'concepto', titulo: 'Concepto' },
  { clave: 'origen', titulo: 'Origen', ancho: '100px' },
  { clave: 'debe', titulo: 'Debe', alineacion: 'derecha' },
  { clave: 'haber', titulo: 'Haber', alineacion: 'derecha' },
  { clave: 'estado', titulo: 'Estado', alineacion: 'centro' },
]

const filasAsientos = computed<Record<string, unknown>[]>(() =>
  asientosPagina.value.map((asiento) => ({
    id: asiento.id,
    numero: asiento.numero ?? '—',
    fecha: formatearFecha(asiento.fecha),
    concepto: asiento.concepto,
    origen: asiento.origen,
    debe: formatearMoneda(asiento.lineas.reduce((t, l) => t + l.debe, 0)),
    haber: formatearMoneda(asiento.lineas.reduce((t, l) => t + l.haber, 0)),
    estado: asiento.estado,
  })),
)

const asientoSeleccionadoId = ref<string | null>(null)

const asientoSeleccionado = computed<Asiento | null>(() =>
  asientoSeleccionadoId.value
    ? (contabilidad.estado.asientos.find((a) => a.id === asientoSeleccionadoId.value) ?? null)
    : null,
)

const documentoAsientoSeleccionado = computed<DocumentoContable | null>(() =>
  asientoSeleccionado.value?.documentoId
    ? (contabilidad.estado.documentos.find(
        (d) => d.id === asientoSeleccionado.value!.documentoId,
      ) ?? null)
    : null,
)

function abrirDetalleAsiento(id: string): void {
  asientoSeleccionadoId.value = id
  void router.push({ name: 'contaduria', query: { vista: 'asientos', asiento: id } })
}

function cerrarDetalleAsiento(): void {
  asientoSeleccionadoId.value = null
  void router.push({ name: 'contaduria', query: { vista: 'asientos' } })
}

// sync asiento query
watch(
  () => route.query.asiento,
  (valor) => {
    if (typeof valor === 'string') asientoSeleccionadoId.value = valor
  },
  { immediate: true },
)

/* -------------------------------------------------------------------------- */
/* Plan de cuentas                                                            */
/* -------------------------------------------------------------------------- */

const arbolCuentas = computed(() => construirArbolCuentas(contabilidad.estado.cuentas))

function limpiarFiltrosDoc(): void {
  Object.assign(filtrosDoc, filtrosDocumentoVacios())
  paginaDoc.value = 1
}

function limpiarFiltrosAsiento(): void {
  Object.assign(filtrosAsiento, filtrosAsientoVacios())
  paginaAsiento.value = 1
}

function irPaginaDoc(n: number): void {
  paginaDoc.value = n
}

function irPaginaAsiento(n: number): void {
  paginaAsiento.value = n
}

function cambiarFiltroOrigenDoc(v: string): void {
  filtrosDoc.origen = v as FiltrosDocumento['origen']
}

function cambiarFiltroEstadoDoc(v: string): void {
  filtrosDoc.estado = v as FiltrosDocumento['estado']
}

function cambiarFiltroOrigenAsiento(v: string): void {
  filtrosAsiento.origen = v
}

function cambiarFiltroEstadoAsiento(v: string): void {
  filtrosAsiento.estado = v
}

function cambiarFiltroCuentaAsiento(v: string): void {
  filtrosAsiento.cuenta = v
}
</script>

<template>
  <section class="page">
    <div class="page__header">
      <div>
        <h2>Contaduría</h2>
        <p class="page__lead">Revisión de documentación, asientos contables y plan de cuentas.</p>
      </div>
    </div>

    <AppTabs :tabs="tabs" :model-value="tabActiva" @update:model-value="cambiarVista" />

    <!-- ===================== BANDEJA ===================== -->
    <template v-if="vista === 'bandeja'">
      <AppCard
        titulo="Bandeja de documentos"
        descripcion="Documentos pendientes de revisión y registración."
      >
        <div class="contaduria-filtros">
          <AppInput
            v-model="filtrosDoc.texto"
            label="Buscar"
            placeholder="Número, descripción, contraparte..."
          />
          <AppSelect
            :model-value="filtrosDoc.origen"
            label="Origen"
            :opciones="opcionesOrigen"
            @update:model-value="cambiarFiltroOrigenDoc"
          />
          <AppSelect
            :model-value="filtrosDoc.estado"
            label="Estado"
            :opciones="opcionesEstadoDoc"
            @update:model-value="cambiarFiltroEstadoDoc"
          />
          <AppInput v-model="filtrosDoc.desde" type="date" label="Desde" />
          <AppInput v-model="filtrosDoc.hasta" type="date" label="Hasta" />
          <AppButton variante="fantasma" @click="limpiarFiltrosDoc">
            <FilterX :size="16" />
            Limpiar
          </AppButton>
        </div>

        <DataTable
          :columnas="columnasBandeja"
          :filas="filasBandeja"
          :total="documentosFiltrados.length"
          clave-fila="id"
        >
          <template #celda-fecha="{ fila }">{{ fila.fecha }}</template>
          <template #celda-numero="{ fila }">
            <button class="enlace-tabla" @click="abrirDetalleDocumento(String(fila.id))">
              {{ fila.numero }}
            </button>
          </template>
          <template #celda-tipo="{ fila }">{{ fila.tipo }}</template>
          <template #celda-origen="{ fila }">{{ fila.origen }}</template>
          <template #celda-contraparte="{ fila }">{{ fila.contraparte }}</template>
          <template #celda-importe="{ fila }">{{ fila.importeTexto }}</template>
          <template #celda-estado="{ fila }">
            <AppBadge :tipo="fila.tipoBadge as TipoBadge">{{ fila.estado }}</AppBadge>
          </template>
          <template #celda-acciones="{ fila }">
            <AppButton
              variante="secundario"
              tamano="sm"
              @click="abrirDetalleDocumento(String(fila.id))"
            >
              <Eye :size="14" />
            </AppButton>
          </template>
        </DataTable>

        <AppPagination
          v-if="totalPaginasDoc > 1"
          :pagina="paginaDoc"
          :total-paginas="totalPaginasDoc"
          @update:pagina="irPaginaDoc"
        />
      </AppCard>

      <!-- Detalle documento -->
      <AppCard
        v-if="documentoSeleccionado"
        titulo="Detalle del documento"
        :descripcion="documentoSeleccionado.descripcion"
      >
        <div class="contaduria-detalle">
          <div class="contaduria-detalle__grid">
            <div>
              <h4>Información comercial</h4>
              <dl class="contaduria-dl">
                <dt>Número</dt>
                <dd>{{ documentoSeleccionado.numero }}</dd>
                <dt>Tipo</dt>
                <dd>{{ etiquetaTipoDocumento(documentoSeleccionado.tipo) }}</dd>
                <dt>Origen</dt>
                <dd>{{ etiquetaOrigenDocumento(documentoSeleccionado.origen) }}</dd>
                <dt>Fecha</dt>
                <dd>{{ formatearFecha(documentoSeleccionado.fecha) }}</dd>
                <dt>Contraparte</dt>
                <dd>{{ documentoSeleccionado.contraparte ?? '—' }}</dd>
                <dt>Importe</dt>
                <dd>{{ formatearMoneda(documentoSeleccionado.importe) }}</dd>
                <dt>Estado</dt>
                <dd>
                  <AppBadge
                    :tipo="tipoBadgeEstadoDocumento(documentoSeleccionado.estado) as TipoBadge"
                  >
                    {{ etiquetaEstadoDocumento(documentoSeleccionado.estado) }}
                  </AppBadge>
                </dd>
                <dt v-if="documentoSeleccionado.motivoObservacion">Motivo observación</dt>
                <dd v-if="documentoSeleccionado.motivoObservacion">
                  {{ documentoSeleccionado.motivoObservacion }}
                </dd>
              </dl>
            </div>

            <div>
              <h4>Impuestos y cuenta sugerida</h4>
              <template v-if="asientoSeleccionadoDoc">
                <ul class="contaduria-cuentas">
                  <li v-for="cuenta in cuentasDelAsiento(asientoSeleccionadoDoc)" :key="cuenta">
                    {{ cuenta }} —
                    {{
                      contabilidad.estado.cuentas.find((c) => c.codigo === cuenta)?.nombre ?? cuenta
                    }}
                  </li>
                </ul>
                <p class="texto-suave">
                  Asiento propuesto Nº {{ asientoSeleccionadoDoc.numero ?? '—' }} ·
                  {{ asientoSeleccionadoDoc.concepto }}
                </p>
              </template>
              <p v-else class="texto-suave">Sin asiento asociado.</p>
            </div>
          </div>

          <!-- Asiento propuesto -->
          <div v-if="asientoSeleccionadoDoc" class="contaduria-asiento">
            <h4>Asiento propuesto</h4>
            <DataTable
              :columnas="[
                { clave: 'cuenta', titulo: 'Cuenta' },
                { clave: 'detalle', titulo: 'Detalle' },
                { clave: 'debe', titulo: 'Debe', alineacion: 'derecha' },
                { clave: 'haber', titulo: 'Haber', alineacion: 'derecha' },
              ]"
              :filas="
                asientoSeleccionadoDoc.lineas.map((l, i) => ({
                  id: i,
                  cuenta: l.cuentaId,
                  detalle: l.detalle ?? '',
                  debe: formatearMoneda(l.debe),
                  haber: formatearMoneda(l.haber),
                }))
              "
              clave-fila="id"
            >
              <template #celda-cuenta="{ fila }">
                {{ fila.cuenta }} —
                {{
                  contabilidad.estado.cuentas.find((c) => c.codigo === fila.cuenta)?.nombre ?? ''
                }}
              </template>
              <template #celda-detalle="{ fila }">{{ fila.detalle }}</template>
              <template #celda-debe="{ fila }">{{ fila.debe }}</template>
              <template #celda-haber="{ fila }">{{ fila.haber }}</template>
            </DataTable>
            <p class="contaduria-totales">
              Total Debe:
              {{ formatearMoneda(asientoSeleccionadoDoc.lineas.reduce((t, l) => t + l.debe, 0)) }}
              · Total Haber:
              {{ formatearMoneda(asientoSeleccionadoDoc.lineas.reduce((t, l) => t + l.haber, 0)) }}
            </p>
          </div>

          <!-- Operación comercial -->
          <div v-if="operacionComercial" class="contaduria-comercial">
            <h4>Información comercial asociada</h4>
            <pre class="contaduria-json">{{ JSON.stringify(operacionComercial, null, 2) }}</pre>
          </div>

          <div class="contaduria-acciones">
            <AppButton variante="secundario" @click="ponerEnRevision(documentoSeleccionado.id)">
              En revisión
            </AppButton>
            <AppButton variante="primario" @click="aprobarYRegistrar(documentoSeleccionado.id)">
              <CheckCircle2 :size="16" />
              Aprobar y registrar
            </AppButton>
            <AppButton variante="peligro" @click="solicitarObservacion(documentoSeleccionado.id)">
              <XCircle :size="16" />
              Observar
            </AppButton>
            <AppButton
              v-if="documentoSeleccionado.estado === 'observado'"
              variante="secundario"
              @click="reabrir(documentoSeleccionado.id)"
            >
              <RotateCcw :size="16" />
              Reabrir
            </AppButton>
            <AppButton variante="fantasma" @click="cerrarDetalleDocumento">Cerrar</AppButton>
          </div>
        </div>
      </AppCard>
    </template>

    <!-- ===================== ASIENTOS ===================== -->
    <template v-else-if="vista === 'asientos'">
      <AppCard titulo="Asientos contables" descripcion="Asientos propuestos y registrados.">
        <div class="contaduria-filtros">
          <AppInput
            v-model="filtrosAsiento.texto"
            label="Buscar"
            placeholder="Concepto, número, documento..."
          />
          <AppSelect
            :model-value="filtrosAsiento.origen"
            label="Origen"
            :opciones="opcionesOrigenAsiento"
            @update:model-value="cambiarFiltroOrigenAsiento"
          />
          <AppSelect
            :model-value="filtrosAsiento.estado"
            label="Estado"
            :opciones="opcionesEstadoAsiento"
            @update:model-value="cambiarFiltroEstadoAsiento"
          />
          <AppSelect
            :model-value="filtrosAsiento.cuenta"
            label="Cuenta"
            :opciones="opcionesCuenta"
            @update:model-value="cambiarFiltroCuentaAsiento"
          />
          <AppInput v-model="filtrosAsiento.desde" type="date" label="Desde" />
          <AppInput v-model="filtrosAsiento.hasta" type="date" label="Hasta" />
          <AppButton variante="fantasma" @click="limpiarFiltrosAsiento">
            <FilterX :size="16" />
            Limpiar
          </AppButton>
        </div>

        <DataTable
          :columnas="columnasAsientos"
          :filas="filasAsientos"
          :total="asientosFiltrados.length"
          clave-fila="id"
        >
          <template #celda-numero="{ fila }">
            <button class="enlace-tabla" @click="abrirDetalleAsiento(String(fila.id))">
              {{ fila.numero }}
            </button>
          </template>
          <template #celda-fecha="{ fila }">{{ fila.fecha }}</template>
          <template #celda-concepto="{ fila }">{{ fila.concepto }}</template>
          <template #celda-origen="{ fila }">{{ fila.origen }}</template>
          <template #celda-debe="{ fila }">{{ fila.debe }}</template>
          <template #celda-haber="{ fila }">{{ fila.haber }}</template>
          <template #celda-estado="{ fila }">
            <AppBadge
              :tipo="
                (fila.estado === 'registrado'
                  ? 'exito'
                  : fila.estado === 'propuesto'
                    ? 'advertencia'
                    : 'neutral') as TipoBadge
              "
            >
              {{ fila.estado }}
            </AppBadge>
          </template>
        </DataTable>

        <AppPagination
          v-if="totalPaginasAsiento > 1"
          :pagina="paginaAsiento"
          :total-paginas="totalPaginasAsiento"
          @update:pagina="irPaginaAsiento"
        />
      </AppCard>

      <AppCard
        v-if="asientoSeleccionado"
        titulo="Detalle del asiento"
        :descripcion="asientoSeleccionado.concepto"
      >
        <div class="contaduria-detalle">
          <dl class="contaduria-dl">
            <dt>Número</dt>
            <dd>{{ asientoSeleccionado.numero ?? '—' }}</dd>
            <dt>Fecha</dt>
            <dd>{{ formatearFecha(asientoSeleccionado.fecha) }}</dd>
            <dt>Origen</dt>
            <dd>{{ asientoSeleccionado.origen }} · {{ asientoSeleccionado.origenId ?? '—' }}</dd>
            <dt>Estado</dt>
            <dd>{{ asientoSeleccionado.estado }}</dd>
            <dt>Documento de origen</dt>
            <dd>
              <template v-if="documentoAsientoSeleccionado">
                {{ documentoAsientoSeleccionado.numero }} —
                {{ etiquetaTipoDocumento(documentoAsientoSeleccionado.tipo) }}
              </template>
              <template v-else>—</template>
            </dd>
          </dl>

          <DataTable
            :columnas="[
              { clave: 'cuenta', titulo: 'Cuenta' },
              { clave: 'detalle', titulo: 'Detalle' },
              { clave: 'debe', titulo: 'Debe', alineacion: 'derecha' },
              { clave: 'haber', titulo: 'Haber', alineacion: 'derecha' },
            ]"
            :filas="
              asientoSeleccionado.lineas.map((l, i) => ({
                id: i,
                cuenta: l.cuentaId,
                detalle: l.detalle ?? '',
                debe: formatearMoneda(l.debe),
                haber: formatearMoneda(l.haber),
              }))
            "
            clave-fila="id"
          >
            <template #celda-cuenta="{ fila }">
              {{ fila.cuenta }} —
              {{ contabilidad.estado.cuentas.find((c) => c.codigo === fila.cuenta)?.nombre ?? '' }}
            </template>
            <template #celda-detalle="{ fila }">{{ fila.detalle }}</template>
            <template #celda-debe="{ fila }">{{ fila.debe }}</template>
            <template #celda-haber="{ fila }">{{ fila.haber }}</template>
          </DataTable>

          <div class="contaduria-acciones">
            <RouterLink
              v-if="documentoAsientoSeleccionado"
              class="ui-button ui-button--secundario"
              :to="{
                name: 'contaduria',
                query: { vista: 'bandeja', documento: documentoAsientoSeleccionado.id },
              }"
            >
              Ver documento de origen
            </RouterLink>
            <AppButton variante="fantasma" @click="cerrarDetalleAsiento">Cerrar</AppButton>
          </div>
        </div>
      </AppCard>
    </template>

    <!-- ===================== PLAN DE CUENTAS ===================== -->
    <template v-else>
      <AppCard titulo="Plan de cuentas" descripcion="Estructura jerárquica del plan contable.">
        <ul class="plan-cuentas">
          <li v-for="raiz in arbolCuentas" :key="raiz.codigo">
            <PlanCuentasNodo :cuenta="raiz" :nivel="0" />
          </li>
        </ul>
      </AppCard>
    </template>

    <!-- Modal observar -->
    <AppModal
      v-model="mostrarModalObservar"
      titulo="Observar documento"
      descripcion="Indicá el motivo de la observación."
    >
      <AppTextarea
        v-model="motivoObservacion"
        label="Motivo"
        placeholder="Motivo de la observación..."
      />
      <template #pie>
        <AppButton variante="fantasma" @click="mostrarModalObservar = false">Cancelar</AppButton>
        <AppButton variante="peligro" @click="confirmarObservacion">Observar</AppButton>
      </template>
    </AppModal>
  </section>
</template>
