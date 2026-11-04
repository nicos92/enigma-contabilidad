<script setup lang="ts">
import { BookOpen, Eye, FilterX, Library, Scale } from '@lucide/vue'
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
import DataTable from '@/components/ui/DataTable.vue'
import type { ColumnaTabla, OpcionSelect, TabItem } from '@/components/ui/tipos'
import { derivarLibroDiario, derivarLibroMayor } from '@/core/contabilidad'
import type { FechaISO } from '@/types'
import type {
  DocumentoContable,
  FilaLibroDiario,
  LibroDiario,
  MayorCuenta,
  MovimientoMayor,
} from '@/types/contabilidad'
import { formatearFecha, formatearMoneda } from '@/core/dinero'
import { useContabilidadStore } from '@/stores/contabilidad'

const contabilidad = useContabilidadStore()
const route = useRoute()
const router = useRouter()

type VistaLibros = 'diario' | 'mayor'

const vista = computed<VistaLibros>(() => (route.query.vista === 'mayor' ? 'mayor' : 'diario'))

function cambiarVista(id: string): void {
  void router.push({ name: 'libros', query: { vista: id } })
}

const tabs: TabItem[] = [
  { id: 'diario', etiqueta: 'Libro Diario' },
  { id: 'mayor', etiqueta: 'Libro Mayor' },
]

const tabActiva = computed(() => vista.value)

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/* -------------------------------------------------------------------------- */
/* Libro Diario                                                               */
/* -------------------------------------------------------------------------- */

interface FiltrosDiario {
  texto: string
  numero: string
  cuenta: string
  desde: string
  hasta: string
}

const filtrosDiario = reactive<FiltrosDiario>({
  texto: '',
  numero: '',
  cuenta: '',
  desde: '',
  hasta: '',
})

const paginaDiario = ref(1)
const tamanoPagina = 12

const opcionesCuentaDiario: readonly OpcionSelect[] = contabilidad.estado.cuentas
  .filter((cuenta) => cuenta.imputable)
  .map((cuenta) => ({ valor: cuenta.codigo, etiqueta: `${cuenta.codigo} - ${cuenta.nombre}` }))

const rangoDiario = computed(() => ({
  desde: filtrosDiario.desde ? (filtrosDiario.desde as FechaISO) : undefined,
  hasta: filtrosDiario.hasta ? (filtrosDiario.hasta as FechaISO) : undefined,
}))

const diario = computed<LibroDiario>(() => {
  const rango = rangoDiario.value.desde || rangoDiario.value.hasta ? rangoDiario.value : undefined
  const base = derivarLibroDiario(contabilidad.estado.asientos, contabilidad.estado.cuentas, rango)

  let filas = base.filas

  if (filtrosDiario.numero.trim()) {
    const consulta = filtrosDiario.numero.trim()
    const numero = Number(consulta)
    filas = filas.filter((fila) =>
      Number.isFinite(numero) && consulta !== '' && !Number.isNaN(numero)
        ? fila.numeroAsiento === numero
        : String(fila.numeroAsiento).includes(consulta),
    )
  }

  if (filtrosDiario.cuenta) {
    filas = filas.filter((fila) => fila.cuentaId === filtrosDiario.cuenta)
  }

  if (filtrosDiario.texto.trim()) {
    const consulta = normalizarTexto(filtrosDiario.texto)
    filas = filas.filter((fila) =>
      [fila.concepto, fila.cuentaId, fila.cuentaNombre, fila.detalle, String(fila.numeroAsiento)]
        .map(normalizarTexto)
        .some((valor) => valor.includes(consulta)),
    )
  }

  const totalDebe = filas.reduce((total, fila) => total + fila.debe, 0)
  const totalHaber = filas.reduce((total, fila) => total + fila.haber, 0)

  const idsAsientos = new Set(filas.map((fila) => fila.asientoId))
  const asientos = base.asientos.filter((asiento) => idsAsientos.has(asiento.id))

  return {
    asientos,
    filas,
    totalDebe,
    totalHaber,
    balanceado: totalDebe === totalHaber && totalDebe > 0,
  }
})

const totalPaginasDiario = computed(() =>
  Math.max(1, Math.ceil(diario.value.filas.length / tamanoPagina)),
)

const filasDiarioPagina = computed(() => {
  const inicio = (paginaDiario.value - 1) * tamanoPagina
  return diario.value.filas.slice(inicio, inicio + tamanoPagina)
})

watch(
  () => [
    filtrosDiario.texto,
    filtrosDiario.numero,
    filtrosDiario.cuenta,
    filtrosDiario.desde,
    filtrosDiario.hasta,
  ],
  () => {
    paginaDiario.value = 1
  },
)

watch(totalPaginasDiario, (total) => {
  if (paginaDiario.value > total) paginaDiario.value = total
})

const documentosPorId = computed(
  () => new Map(contabilidad.estado.documentos.map((documento) => [documento.id, documento])),
)

const asientosPorId = computed(
  () => new Map(contabilidad.estado.asientos.map((asiento) => [asiento.id, asiento])),
)

const filasDiario = computed<Record<string, unknown>[]>(() =>
  filasDiarioPagina.value.map((fila: FilaLibroDiario, indice: number) => {
    const asiento = asientosPorId.value.get(fila.asientoId)
    const documento = asiento?.documentoId
      ? documentosPorId.value.get(asiento.documentoId)
      : undefined
    return {
      id: `${fila.asientoId}-${fila.cuentaId}-${indice}`,
      asientoId: fila.asientoId,
      fecha: formatearFecha(fila.fecha),
      fechaISO: fila.fecha,
      numero: fila.numeroAsiento,
      cuenta: fila.cuentaId,
      cuentaNombre: fila.cuentaNombre,
      descripcion: fila.detalle || fila.concepto,
      concepto: fila.concepto,
      debe: formatearMoneda(fila.debe),
      haber: formatearMoneda(fila.haber),
      debeNumero: fila.debe,
      haberNumero: fila.haber,
      comprobante: documento?.numero ?? '—',
      documentoId: documento?.id ?? null,
    }
  }),
)

const columnasDiario: readonly ColumnaTabla[] = [
  { clave: 'fecha', titulo: 'Fecha', ancho: '92px' },
  { clave: 'numero', titulo: 'Nº asiento', ancho: '84px' },
  { clave: 'cuenta', titulo: 'Cuenta' },
  { clave: 'descripcion', titulo: 'Descripción' },
  { clave: 'debe', titulo: 'Debe', alineacion: 'derecha' },
  { clave: 'haber', titulo: 'Haber', alineacion: 'derecha' },
  { clave: 'comprobante', titulo: 'Comprobante', ancho: '120px' },
  { clave: 'acciones', titulo: '', alineacion: 'derecha', ancho: '72px' },
]

function limpiarFiltrosDiario(): void {
  Object.assign(filtrosDiario, { texto: '', numero: '', cuenta: '', desde: '', hasta: '' })
  paginaDiario.value = 1
}

function irPaginaDiario(n: number): void {
  paginaDiario.value = n
}

function cambiarFiltroCuentaDiario(valor: string): void {
  filtrosDiario.cuenta = valor
}

/* -------------------------------------------------------------------------- */
/* Libro Mayor                                                                */
/* -------------------------------------------------------------------------- */

const filtrosMayor = reactive<{ desde: string; hasta: string }>({ desde: '', hasta: '' })

const cuentaSeleccionada = ref<string>(
  contabilidad.estado.cuentas.find((cuenta) => cuenta.imputable)?.codigo ?? '',
)

watch(
  () => route.query.cuenta,
  (valor) => {
    if (typeof valor === 'string' && valor) cuentaSeleccionada.value = valor
  },
  { immediate: true },
)

const opcionesCuentaMayor: readonly OpcionSelect[] = contabilidad.estado.cuentas
  .filter((cuenta) => cuenta.imputable)
  .map((cuenta) => ({ valor: cuenta.codigo, etiqueta: `${cuenta.codigo} - ${cuenta.nombre}` }))

const rangoMayor = computed(() => ({
  desde: filtrosMayor.desde ? (filtrosMayor.desde as FechaISO) : undefined,
  hasta: filtrosMayor.hasta ? (filtrosMayor.hasta as FechaISO) : undefined,
}))

const diarioCompleto = computed(() =>
  derivarLibroDiario(contabilidad.estado.asientos, contabilidad.estado.cuentas),
)

const libroMayor = computed(() => {
  const rango = rangoMayor.value.desde || rangoMayor.value.hasta ? rangoMayor.value : undefined
  return derivarLibroMayor(diarioCompleto.value, contabilidad.estado.cuentas, rango)
})

const mayorCuenta = computed<MayorCuenta | undefined>(
  () => libroMayor.value[cuentaSeleccionada.value],
)

const filasMayor = computed<Record<string, unknown>[]>(() =>
  (mayorCuenta.value?.movimientos ?? []).map((movimiento: MovimientoMayor, indice: number) => ({
    id: `${movimiento.asientoId}-${indice}`,
    asientoId: movimiento.asientoId,
    fecha: formatearFecha(movimiento.fecha),
    fechaISO: movimiento.fecha,
    numero: movimiento.numeroAsiento,
    concepto: movimiento.concepto,
    debe: formatearMoneda(movimiento.debe),
    haber: formatearMoneda(movimiento.haber),
    saldo: formatearMoneda(movimiento.saldo),
    debeNumero: movimiento.debe,
    haberNumero: movimiento.haber,
    saldoNumero: movimiento.saldo,
  })),
)

function cambiarCuentaMayor(valor: string): void {
  cuentaSeleccionada.value = valor
  void router.replace({ name: 'libros', query: { ...route.query, vista: 'mayor', cuenta: valor } })
}

function limpiarFiltrosMayor(): void {
  filtrosMayor.desde = ''
  filtrosMayor.hasta = ''
}

/* -------------------------------------------------------------------------- */
/* Detalle de asiento                                                         */
/* -------------------------------------------------------------------------- */

const asientoSeleccionadoId = ref<string | null>(null)

const asientoSeleccionado = computed(() =>
  asientoSeleccionadoId.value
    ? (contabilidad.estado.asientos.find((asiento) => asiento.id === asientoSeleccionadoId.value) ??
      null)
    : null,
)

const documentoAsientoSeleccionado = computed<DocumentoContable | null>(() =>
  asientoSeleccionado.value?.documentoId
    ? (contabilidad.estado.documentos.find(
        (documento) => documento.id === asientoSeleccionado.value!.documentoId,
      ) ?? null)
    : null,
)

function abrirDetalleAsiento(id: string): void {
  asientoSeleccionadoId.value = id
  void router.push({
    name: 'libros',
    query: { ...route.query, asiento: id },
  })
}

function cerrarDetalleAsiento(): void {
  asientoSeleccionadoId.value = null
  if (route.query.asiento) {
    const query = { ...route.query }
    delete query.asiento
    void router.replace({ name: 'libros', query })
  }
}

watch(
  () => route.query.asiento,
  (valor) => {
    if (typeof valor === 'string') asientoSeleccionadoId.value = valor
    else asientoSeleccionadoId.value = null
  },
  { immediate: true },
)

function irAContaduriaAsiento(): void {
  if (!asientoSeleccionado.value) return
  void router.push({
    name: 'contaduria',
    query: { vista: 'asientos', asiento: asientoSeleccionado.value.id },
  })
}

function irAContaduriaDocumento(): void {
  if (!documentoAsientoSeleccionado.value) return
  void router.push({
    name: 'contaduria',
    query: { vista: 'bandeja', documento: documentoAsientoSeleccionado.value.id },
  })
}
</script>

<template>
  <section class="page libros">
    <div class="page__header">
      <div>
        <h2>Libros contables</h2>
        <p class="page__lead">
          Libro Diario y Libro Mayor derivados exclusivamente de los asientos registrados. El Mayor
          se deriva del Diario y respeta la naturaleza de cada cuenta.
        </p>
      </div>
    </div>

    <AppTabs :tabs="tabs" :model-value="tabActiva" @update:model-value="cambiarVista" />

    <!-- ===================== LIBRO DIARIO ===================== -->
    <template v-if="vista === 'diario'">
      <AppCard titulo="Libro Diario" descripcion="Asientos registrados ordenados cronológicamente.">
        <div class="libros-filtros">
          <AppInput
            v-model="filtrosDiario.texto"
            label="Buscar"
            placeholder="Concepto, cuenta, comprobante..."
          />
          <AppInput v-model="filtrosDiario.numero" label="Nº de asiento" placeholder="Ej. 1" />
          <AppSelect
            :model-value="filtrosDiario.cuenta"
            label="Cuenta"
            placeholder="Todas"
            :opciones="opcionesCuentaDiario"
            @update:model-value="cambiarFiltroCuentaDiario"
          />
          <AppInput v-model="filtrosDiario.desde" type="date" label="Desde" />
          <AppInput v-model="filtrosDiario.hasta" type="date" label="Hasta" />
          <AppButton variante="fantasma" @click="limpiarFiltrosDiario">
            <FilterX :size="16" />
            Limpiar
          </AppButton>
        </div>

        <DataTable
          :columnas="columnasDiario"
          :filas="filasDiario"
          :total="diario.filas.length"
          clave-fila="id"
          compacta
          vacio-titulo="Sin movimientos para los filtros"
          vacio-mensaje="Probá con otro rango de fechas, número de asiento o cuenta."
        >
          <template #celda-fecha="{ fila }">{{ fila.fecha }}</template>
          <template #celda-numero="{ fila }">
            <button class="enlace-tabla" @click="abrirDetalleAsiento(String(fila.asientoId))">
              {{ fila.numero }}
            </button>
          </template>
          <template #celda-cuenta="{ fila }">
            <span class="texto-mono">{{ fila.cuenta }}</span> — {{ fila.cuentaNombre }}
          </template>
          <template #celda-descripcion="{ fila }">{{ fila.descripcion }}</template>
          <template #celda-debe="{ fila }">
            <span class="texto-mono">{{ fila.debe }}</span>
          </template>
          <template #celda-haber="{ fila }">
            <span class="texto-mono">{{ fila.haber }}</span>
          </template>
          <template #celda-comprobante="{ fila }">
            <template v-if="fila.documentoId">
              <button class="enlace-tabla" @click="abrirDetalleAsiento(String(fila.asientoId))">
                {{ fila.comprobante }}
              </button>
            </template>
            <template v-else>{{ fila.comprobante }}</template>
          </template>
          <template #celda-acciones="{ fila }">
            <AppButton
              variante="secundario"
              tamano="sm"
              solo-icono
              aria-label="Ver asiento"
              @click="abrirDetalleAsiento(String(fila.asientoId))"
            >
              <Eye :size="14" />
            </AppButton>
          </template>
        </DataTable>

        <AppPagination
          v-if="totalPaginasDiario > 1"
          :pagina="paginaDiario"
          :total-paginas="totalPaginasDiario"
          @update:pagina="irPaginaDiario"
        />

        <div class="libros-totales">
          <div class="libros-totales__fila">
            <span>Total Debe</span>
            <strong class="texto-mono">{{ formatearMoneda(diario.totalDebe) }}</strong>
          </div>
          <div class="libros-totales__fila">
            <span>Total Haber</span>
            <strong class="texto-mono">{{ formatearMoneda(diario.totalHaber) }}</strong>
          </div>
          <div class="libros-totales__fila libros-totales__fila--verificacion">
            <span>Verificación Debe = Haber</span>
            <AppBadge :tipo="diario.balanceado ? 'exito' : 'error'">
              {{ diario.balanceado ? 'Balanceado' : 'Diferencia' }}
            </AppBadge>
            <strong class="texto-mono">
              {{ formatearMoneda(Math.abs(diario.totalDebe - diario.totalHaber)) }}
            </strong>
          </div>
        </div>
      </AppCard>

      <AppCard
        v-if="diario.filas.length > 0"
        titulo="Asientos del Diario"
        :descripcion="`${diario.asientos.length} asientos registrados en el período seleccionado`"
      >
        <p class="texto-suave">
          <BookOpen :size="14" />
          El Libro Diario muestra únicamente asientos registrados; los asientos propuestos no
          participan de los libros.
        </p>
      </AppCard>
    </template>

    <!-- ===================== LIBRO MAYOR ===================== -->
    <template v-else>
      <AppCard
        titulo="Libro Mayor"
        descripcion="Movimientos y saldos por cuenta, derivados del Diario."
      >
        <div class="libros-filtros">
          <AppSelect
            :model-value="cuentaSeleccionada"
            label="Cuenta"
            :opciones="opcionesCuentaMayor"
            @update:model-value="cambiarCuentaMayor"
          />
          <AppInput v-model="filtrosMayor.desde" type="date" label="Desde" />
          <AppInput v-model="filtrosMayor.hasta" type="date" label="Hasta" />
          <AppButton variante="fantasma" @click="limpiarFiltrosMayor">
            <FilterX :size="16" />
            Limpiar
          </AppButton>
        </div>

        <template v-if="mayorCuenta">
          <div class="libros-mayor-resumen">
            <article class="libros-resumen__item">
              <span>Saldo inicial</span>
              <strong class="texto-mono">{{ formatearMoneda(mayorCuenta.saldoInicial) }}</strong>
            </article>
            <article class="libros-resumen__item">
              <span>Total Debe</span>
              <strong class="texto-mono">{{ formatearMoneda(mayorCuenta.totalDebe) }}</strong>
            </article>
            <article class="libros-resumen__item">
              <span>Total Haber</span>
              <strong class="texto-mono">{{ formatearMoneda(mayorCuenta.totalHaber) }}</strong>
            </article>
            <article class="libros-resumen__item libros-resumen__item--final">
              <span>Saldo final</span>
              <strong class="texto-mono">{{ formatearMoneda(mayorCuenta.saldoFinal) }}</strong>
            </article>
          </div>

          <p class="texto-suave libros-naturaleza">
            Cuenta {{ mayorCuenta.cuenta.codigo }} — {{ mayorCuenta.cuenta.nombre }} · Naturaleza
            {{ mayorCuenta.cuenta.naturaleza }} · Tipo {{ mayorCuenta.cuenta.tipo }}.
            <Scale :size="14" />
            El saldo respeta la naturaleza de la cuenta.
          </p>

          <DataTable
            :columnas="[
              { clave: 'fecha', titulo: 'Fecha', ancho: '92px' },
              { clave: 'numero', titulo: 'Nº asiento', ancho: '84px' },
              { clave: 'concepto', titulo: 'Concepto' },
              { clave: 'debe', titulo: 'Debe', alineacion: 'derecha' },
              { clave: 'haber', titulo: 'Haber', alineacion: 'derecha' },
              { clave: 'saldo', titulo: 'Saldo', alineacion: 'derecha' },
              { clave: 'acciones', titulo: '', alineacion: 'derecha', ancho: '72px' },
            ]"
            :filas="filasMayor"
            :total="filasMayor.length"
            clave-fila="id"
            compacta
            vacio-titulo="Sin movimientos para la cuenta en el período"
            vacio-mensaje="Probá con otro período o seleccioná otra cuenta."
          >
            <template #celda-fecha="{ fila }">{{ fila.fecha }}</template>
            <template #celda-numero="{ fila }">
              <button class="enlace-tabla" @click="abrirDetalleAsiento(String(fila.asientoId))">
                {{ fila.numero }}
              </button>
            </template>
            <template #celda-concepto="{ fila }">{{ fila.concepto }}</template>
            <template #celda-debe="{ fila }">
              <span class="texto-mono">{{ fila.debe }}</span>
            </template>
            <template #celda-haber="{ fila }">
              <span class="texto-mono">{{ fila.haber }}</span>
            </template>
            <template #celda-saldo="{ fila }">
              <span class="texto-mono">{{ fila.saldo }}</span>
            </template>
            <template #celda-acciones="{ fila }">
              <AppButton
                variante="secundario"
                tamano="sm"
                solo-icono
                aria-label="Abrir asiento original"
                @click="abrirDetalleAsiento(String(fila.asientoId))"
              >
                <Eye :size="14" />
              </AppButton>
            </template>
          </DataTable>

          <p class="texto-suave libros-derivacion">
            <Library :size="14" />
            El Libro Mayor se deriva del Libro Diario: cada movimiento proviene de una fila del
            Diario registrada.
          </p>
        </template>

        <template v-else>
          <p class="texto-suave">Seleccioná una cuenta imputable para consultar su mayor.</p>
        </template>
      </AppCard>
    </template>

    <!-- Detalle de asiento -->
    <AppModal
      :model-value="Boolean(asientoSeleccionado)"
      :titulo="
        asientoSeleccionado
          ? `Asiento N.º ${asientoSeleccionado.numero ?? '—'}`
          : 'Detalle de asiento'
      "
      descripcion="Información del asiento y su comprobante de origen."
      tamano="lg"
      @update:model-value="
        (abierto) => {
          if (!abierto) cerrarDetalleAsiento()
        }
      "
    >
      <template v-if="asientoSeleccionado">
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
            <dt>Concepto</dt>
            <dd>{{ asientoSeleccionado.concepto }}</dd>
            <dt>Comprobante de origen</dt>
            <dd>
              <template v-if="documentoAsientoSeleccionado">
                {{ documentoAsientoSeleccionado.numero }} —
                {{ documentoAsientoSeleccionado.tipo }}
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
              asientoSeleccionado.lineas.map((linea, indice) => ({
                id: indice,
                cuenta: linea.cuentaId,
                detalle: linea.detalle ?? '',
                debe: formatearMoneda(linea.debe),
                haber: formatearMoneda(linea.haber),
              }))
            "
            clave-fila="id"
            compacta
          >
            <template #celda-cuenta="{ fila }">
              {{ fila.cuenta }} —
              {{
                contabilidad.estado.cuentas.find((cuenta) => cuenta.codigo === fila.cuenta)
                  ?.nombre ?? ''
              }}
            </template>
            <template #celda-detalle="{ fila }">{{ fila.detalle }}</template>
            <template #celda-debe="{ fila }">{{ fila.debe }}</template>
            <template #celda-haber="{ fila }">{{ fila.haber }}</template>
          </DataTable>

          <div class="contaduria-acciones">
            <AppButton variante="secundario" @click="irAContaduriaAsiento">
              Ver en Contaduría
            </AppButton>
            <AppButton
              v-if="documentoAsientoSeleccionado"
              variante="secundario"
              @click="irAContaduriaDocumento"
            >
              Ver comprobante
            </AppButton>
            <AppButton variante="fantasma" @click="cerrarDetalleAsiento">Cerrar</AppButton>
          </div>
        </div>
      </template>
    </AppModal>
  </section>
</template>

<style scoped>
.libros-filtros {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  align-items: end;
  margin-bottom: 1rem;
}

.libros-totales {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-borde, #e2e8f0);
}

.libros-totales__fila {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.libros-totales__fila--verificacion {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.libros-mayor-resumen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.libros-resumen__item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  border: 1px solid var(--color-borde, #e2e8f0);
  border-radius: 0.5rem;
}

.libros-resumen__item--final {
  border-color: var(--color-marca, #2563eb);
}

.libros-naturaleza,
.libros-derivacion {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}
</style>
