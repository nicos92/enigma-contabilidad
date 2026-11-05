<script setup lang="ts">
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  BookOpenCheck,
  ChartColumn,
  ClipboardCheck,
  FileClock,
  HandCoins,
  Landmark,
  ReceiptText,
  Route,
  ShoppingCart,
  Wallet,
} from '@lucide/vue'
import { computed, type Component } from 'vue'
import { RouterLink, useRouter, type RouteLocationRaw } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import DataTable from '@/components/ui/DataTable.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import GraficoIngresosEgresos from '@/components/dashboard/GraficoIngresosEgresos.vue'
import type { ColumnaTabla, TipoBadge } from '@/components/ui/tipos'
import {
  agruparIngresosEgresosPorSemana,
  construirIndicadores,
  construirUltimasOperaciones,
  documentosPendientesAprobacion,
  operacionesPendientesRegistracion,
} from '@/core/dashboard'
import { formatearFecha, formatearMoneda } from '@/core/dinero'
import { CODIGOS } from '@/data/plan-cuentas'
import { useContabilidadStore } from '@/stores/contabilidad'

interface IndicadorDashboard {
  clave: string
  etiqueta: string
  importe: number
  detalle: string
  icono: Component
  tono: 'marca' | 'exito' | 'advertencia' | 'error' | 'info'
  to: RouteLocationRaw
}

interface AccesoRapido {
  etiqueta: string
  descripcion: string
  icono: Component
  to: RouteLocationRaw
}

const contabilidad = useContabilidadStore()
const router = useRouter()

const empresa = computed(() => contabilidad.estado.empresa)
const periodo = computed(() => contabilidad.estado.periodo)

const saldoCaja = computed(
  () =>
    contabilidad.saldosTesoreria.find((saldo) => saldo.cuentaId === CODIGOS.CAJA)?.saldoFinal ?? 0,
)
const saldoBanco = computed(
  () =>
    contabilidad.saldosTesoreria.find((saldo) => saldo.cuentaId === CODIGOS.BANCO)?.saldoFinal ?? 0,
)

const indicadoresBase = computed(() =>
  construirIndicadores({
    ventas: contabilidad.ventasRegistradas,
    compras: contabilidad.comprasRegistradas,
    saldosClientes: contabilidad.saldosClientes,
    saldosProveedores: contabilidad.saldosProveedores,
    saldosTesoreria: contabilidad.saldosTesoreria,
    resultadoEjercicio: contabilidad.estadoResultados.resultadoEjercicio,
  }),
)

const clientesConSaldo = computed(
  () => contabilidad.saldosClientes.filter((saldo) => saldo.saldo > 0).length,
)
const proveedoresConSaldo = computed(
  () => contabilidad.saldosProveedores.filter((saldo) => saldo.saldo > 0).length,
)

const indicadores = computed<IndicadorDashboard[]>(() => {
  const datos = indicadoresBase.value

  return [
    {
      clave: 'ventas',
      etiqueta: 'Ventas del mes',
      importe: datos.ventas,
      detalle: `${contabilidad.ventasRegistradas.length} facturas registradas`,
      icono: ReceiptText,
      tono: 'marca',
      to: { name: 'ventas' },
    },
    {
      clave: 'compras',
      etiqueta: 'Compras del mes',
      importe: datos.compras,
      detalle: `${contabilidad.comprasRegistradas.length} facturas registradas`,
      icono: ShoppingCart,
      tono: 'info',
      to: { name: 'compras' },
    },
    {
      clave: 'por-cobrar',
      etiqueta: 'Cuentas por cobrar',
      importe: datos.cuentasPorCobrar,
      detalle: `${clientesConSaldo.value} clientes con saldo`,
      icono: HandCoins,
      tono: 'exito',
      to: { name: 'ventas', query: { vista: 'cuentas-por-cobrar' } },
    },
    {
      clave: 'por-pagar',
      etiqueta: 'Cuentas por pagar',
      importe: datos.cuentasPorPagar,
      detalle: `${proveedoresConSaldo.value} proveedores con saldo`,
      icono: Wallet,
      tono: 'advertencia',
      to: { name: 'compras', query: { vista: 'cuentas-por-pagar' } },
    },
    {
      clave: 'disponible',
      etiqueta: 'Saldo disponible',
      importe: datos.saldoDisponible,
      detalle: `Caja ${formatearMoneda(saldoCaja.value)} · Banco ${formatearMoneda(saldoBanco.value)}`,
      icono: Landmark,
      tono: 'info',
      to: { name: 'tesoreria', query: { vista: 'movimientos' } },
    },
    {
      clave: 'resultado',
      etiqueta: 'Resultado del ejercicio',
      importe: datos.resultadoEjercicio,
      detalle: `Antes de impuestos: ${formatearMoneda(contabilidad.estadoResultados.resultadoAntesImpuestos)}`,
      icono: ChartColumn,
      tono: datos.resultadoEjercicio >= 0 ? 'exito' : 'error',
      to: { name: 'balances', query: { vista: 'resultados' } },
    },
  ]
})

const conciliado = computed(
  () =>
    contabilidad.balanceComprobacion.balanceado &&
    contabilidad.estadoSituacionPatrimonial.ecuacionVerificada,
)

const semanas = computed(() =>
  agruparIngresosEgresosPorSemana(contabilidad.movimientosTesoreria, periodo.value),
)

const totalIngresosSemana = computed(() =>
  semanas.value.reduce((total, semana) => total + semana.ingresos, 0),
)
const totalEgresosSemana = computed(() =>
  semanas.value.reduce((total, semana) => total + semana.egresos, 0),
)
const flujoNeto = computed(() => totalIngresosSemana.value - totalEgresosSemana.value)

const ultimasOperaciones = computed(() => construirUltimasOperaciones(contabilidad.estado, 8))

const columnasOperaciones: readonly ColumnaTabla[] = [
  { clave: 'fecha', titulo: 'Fecha', ancho: '92px' },
  { clave: 'operacion', titulo: 'Operación' },
  { clave: 'contraparte', titulo: 'Contraparte' },
  { clave: 'importe', titulo: 'Importe', alineacion: 'derecha' },
  { clave: 'estado', titulo: 'Estado', alineacion: 'centro' },
]

function etiquetaEstado(estado: unknown): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente'
    case 'en_revision':
      return 'En revisión'
    case 'aprobado':
      return 'Aprobado'
    case 'registrado':
      return 'Registrado'
    case 'observado':
      return 'Observado'
    default:
      return String(estado ?? '—')
  }
}

function tipoBadgeEstado(estado: unknown): TipoBadge {
  switch (estado) {
    case 'pendiente':
      return 'info'
    case 'en_revision':
      return 'advertencia'
    case 'aprobado':
      return 'marca'
    case 'registrado':
      return 'exito'
    case 'observado':
      return 'error'
    default:
      return 'neutral'
  }
}

function tipoBadgeOperacion(tipo: unknown): TipoBadge {
  switch (tipo) {
    case 'venta':
      return 'exito'
    case 'compra':
      return 'info'
    case 'cobro':
      return 'marca'
    case 'pago':
      return 'advertencia'
    default:
      return 'neutral'
  }
}

function destinoOperacion(fila: Record<string, unknown>): RouteLocationRaw {
  const operacion = String(fila.id)

  switch (fila.tipo) {
    case 'compra':
      return { name: 'compras', query: { operacion } }
    case 'venta':
      return { name: 'ventas', query: { operacion } }
    case 'pago':
      return { name: 'tesoreria', query: { vista: 'pagos', operacion } }
    case 'cobro':
      return { name: 'tesoreria', query: { vista: 'cobros', operacion } }
    case 'transferencia':
      return { name: 'tesoreria', query: { vista: 'movimientos', operacion } }
    default:
      return { name: 'dashboard' }
  }
}

const filasOperaciones = computed<Record<string, unknown>[]>(() =>
  ultimasOperaciones.value.map((operacion) => ({
    id: operacion.id,
    fecha: formatearFecha(operacion.fecha),
    operacion: operacion.descripcion,
    tipo: operacion.tipo,
    etiquetaTipo: operacion.etiquetaTipo,
    contraparte: operacion.contraparte,
    importe: operacion.importe,
    importeTexto: formatearMoneda(operacion.importe),
    estado: operacion.estado,
    estadoTexto: etiquetaEstado(operacion.estado),
  })),
)

const documentosPendientes = computed(() =>
  documentosPendientesAprobacion(contabilidad.estado.documentos),
)

const asientosPendientes = computed(() =>
  operacionesPendientesRegistracion(contabilidad.estado.asientos, contabilidad.estado.documentos),
)

const accesosRapidos: readonly AccesoRapido[] = [
  {
    etiqueta: 'Nueva compra',
    descripcion: 'Registrar una factura recibida',
    icono: ShoppingCart,
    to: { name: 'compras', query: { vista: 'nueva' } },
  },
  {
    etiqueta: 'Nueva venta',
    descripcion: 'Emitir una factura de venta',
    icono: ReceiptText,
    to: { name: 'ventas', query: { vista: 'nueva' } },
  },
  {
    etiqueta: 'Registrar pago',
    descripcion: 'Cancelar una obligación',
    icono: HandCoins,
    to: { name: 'tesoreria', query: { vista: 'pagos', accion: 'nuevo' } },
  },
  {
    etiqueta: 'Registrar cobro',
    descripcion: 'Acreditar una cuenta por cobrar',
    icono: Banknote,
    to: { name: 'tesoreria', query: { vista: 'cobros', accion: 'nuevo' } },
  },
]

function abrirRecorridoGuiado(): void {
  void router.push({ name: 'trazabilidad' })
}
</script>

<template>
  <section class="page dashboard">
    <div class="page__header">
      <div>
        <h2>Panel general</h2>
        <p class="page__lead">
          Bienvenido a Enigma Gestión. Visión general de {{ empresa.nombreComercial }} para
          {{ periodo.etiqueta }}.
        </p>
      </div>
      <div class="page__actions">
        <AppBadge :tipo="conciliado ? 'exito' : 'error'" punto>
          {{ conciliado ? 'Contabilidad conciliada' : 'Revisar contabilidad' }}
        </AppBadge>
        <AppButton variante="secundario" @click="abrirRecorridoGuiado">
          <Route :size="16" aria-hidden="true" />
          Recorrido guiado
        </AppButton>
      </div>
    </div>

    <div class="dashboard__kpis" aria-label="Indicadores del período">
      <RouterLink
        v-for="indicador in indicadores"
        :key="indicador.clave"
        :to="indicador.to"
        class="dashboard-kpi"
        :class="[
          `dashboard-kpi--${indicador.tono}`,
          { 'dashboard-kpi--negativo': indicador.importe < 0 },
        ]"
      >
        <span class="dashboard-kpi__cabecera">
          <span class="dashboard-kpi__icono" aria-hidden="true">
            <component :is="indicador.icono" :size="17" />
          </span>
          <span class="dashboard-kpi__etiqueta">{{ indicador.etiqueta }}</span>
          <ArrowUpRight class="dashboard-kpi__flecha" :size="15" aria-hidden="true" />
        </span>
        <strong class="dashboard-kpi__valor">{{ formatearMoneda(indicador.importe) }}</strong>
        <span class="dashboard-kpi__detalle">{{ indicador.detalle }}</span>
      </RouterLink>
    </div>

    <div class="dashboard__principal">
      <div class="dashboard__columna">
        <AppCard
          titulo="Ingresos y egresos por semana"
          descripcion="Flujo real de caja y banco del período"
        >
          <template #acciones>
            <AppBadge tipo="info">{{ periodo.etiqueta }}</AppBadge>
          </template>

          <div class="dashboard-chart-resumen">
            <div>
              <span>Ingresos</span>
              <strong class="dashboard-chart-resumen__positivo">
                {{ formatearMoneda(totalIngresosSemana) }}
              </strong>
            </div>
            <div>
              <span>Egresos</span>
              <strong class="dashboard-chart-resumen__negativo">
                {{ formatearMoneda(totalEgresosSemana) }}
              </strong>
            </div>
            <div>
              <span>Flujo neto</span>
              <strong :class="flujoNeto >= 0 ? 'es-positivo' : 'es-negativo'">
                {{ formatearMoneda(flujoNeto) }}
              </strong>
            </div>
          </div>

          <GraficoIngresosEgresos :semanas="semanas" />

          <template #pie>
            <div class="dashboard-card-pie">
              <span class="texto-suave">Movimientos de caja y banco del período</span>
              <RouterLink
                class="dashboard-enlace"
                :to="{ name: 'tesoreria', query: { vista: 'movimientos' } }"
              >
                Ver movimientos
                <ArrowRight :size="14" aria-hidden="true" />
              </RouterLink>
            </div>
          </template>
        </AppCard>

        <AppCard
          titulo="Últimas operaciones"
          descripcion="Compras, ventas, pagos y cobros recientes"
        >
          <template #acciones>
            <AppBadge tipo="neutral">{{ ultimasOperaciones.length }} recientes</AppBadge>
          </template>

          <div class="dashboard-tabla">
            <DataTable
              :columnas="columnasOperaciones"
              :filas="filasOperaciones"
              clave-fila="id"
              compacta
              vacio-titulo="Sin operaciones"
              vacio-mensaje="Todavía no hay operaciones registradas en el período."
            >
              <template #celda-operacion="{ fila }">
                <RouterLink class="dashboard-operacion" :to="destinoOperacion(fila)">
                  <AppBadge :tipo="tipoBadgeOperacion(fila.tipo)">
                    {{ fila.etiquetaTipo }}
                  </AppBadge>
                  <span class="dashboard-operacion__texto">{{ fila.operacion }}</span>
                </RouterLink>
              </template>
              <template #celda-importe="{ fila }">
                <span class="texto-mono">{{ fila.importeTexto }}</span>
              </template>
              <template #celda-estado="{ fila }">
                <AppBadge :tipo="tipoBadgeEstado(fila.estado)">{{ fila.estadoTexto }}</AppBadge>
              </template>
            </DataTable>
          </div>
        </AppCard>
      </div>

      <div class="dashboard__columna dashboard__columna--lateral">
        <AppCard titulo="Accesos rápidos" descripcion="Altas y registraciones frecuentes">
          <div class="dashboard-accesos">
            <RouterLink
              v-for="acceso in accesosRapidos"
              :key="acceso.etiqueta"
              :to="acceso.to"
              class="dashboard-acceso"
            >
              <span class="dashboard-acceso__icono" aria-hidden="true">
                <component :is="acceso.icono" :size="17" />
              </span>
              <span class="dashboard-acceso__texto">
                <strong>{{ acceso.etiqueta }}</strong>
                <small>{{ acceso.descripcion }}</small>
              </span>
              <ArrowUpRight :size="15" aria-hidden="true" />
            </RouterLink>
          </div>
        </AppCard>

        <AppCard
          titulo="Documentos pendientes de aprobación"
          :descripcion="`${documentosPendientes.length} para revisar en Contaduría`"
        >
          <template #acciones>
            <AppBadge tipo="advertencia">{{ documentosPendientes.length }}</AppBadge>
          </template>

          <ul v-if="documentosPendientes.length" class="dashboard-lista">
            <li v-for="documento in documentosPendientes" :key="documento.id">
              <RouterLink
                class="dashboard-pendiente"
                :to="{ name: 'contaduria', query: { vista: 'bandeja', documento: documento.id } }"
              >
                <span class="dashboard-pendiente__icono" aria-hidden="true">
                  <FileClock :size="16" />
                </span>
                <span class="dashboard-pendiente__contenido">
                  <span class="dashboard-pendiente__titulo">{{ documento.descripcion }}</span>
                  <span class="dashboard-pendiente__meta">
                    {{ formatearFecha(documento.fecha) }} ·
                    {{ documento.contraparte ?? 'Sin contraparte' }}
                  </span>
                </span>
                <span class="dashboard-pendiente__importe">
                  {{ formatearMoneda(documento.importe) }}
                </span>
                <AppBadge :tipo="tipoBadgeEstado(documento.estado)">
                  {{ etiquetaEstado(documento.estado) }}
                </AppBadge>
              </RouterLink>
            </li>
          </ul>
          <EmptyState
            v-else
            titulo="Bandeja al día"
            mensaje="No hay documentos pendientes de aprobación."
            compacto
          >
            <template #icono>
              <ClipboardCheck :size="22" />
            </template>
          </EmptyState>

          <template #pie>
            <RouterLink
              class="dashboard-enlace"
              :to="{ name: 'contaduria', query: { vista: 'bandeja' } }"
            >
              Abrir bandeja de documentos
              <ArrowRight :size="14" aria-hidden="true" />
            </RouterLink>
          </template>
        </AppCard>

        <AppCard
          titulo="Operaciones pendientes de registración"
          :descripcion="`${asientosPendientes.length} asientos propuestos`"
        >
          <template #acciones>
            <AppBadge tipo="info">{{ asientosPendientes.length }}</AppBadge>
          </template>

          <ul v-if="asientosPendientes.length" class="dashboard-lista">
            <li v-for="asiento in asientosPendientes" :key="asiento.asientoId">
              <RouterLink
                class="dashboard-pendiente"
                :to="{
                  name: 'contaduria',
                  query: { vista: 'asientos', asiento: asiento.asientoId },
                }"
              >
                <span
                  class="dashboard-pendiente__icono dashboard-pendiente__icono--info"
                  aria-hidden="true"
                >
                  <BookOpenCheck :size="16" />
                </span>
                <span class="dashboard-pendiente__contenido">
                  <span class="dashboard-pendiente__titulo">{{ asiento.concepto }}</span>
                  <span class="dashboard-pendiente__meta">
                    {{ formatearFecha(asiento.fecha) }} · {{ asiento.numeroDocumento }}
                  </span>
                </span>
                <span class="dashboard-pendiente__importe">
                  {{ formatearMoneda(asiento.importe) }}
                </span>
                <AppBadge :tipo="tipoBadgeEstado(asiento.estadoDocumento)">
                  {{ etiquetaEstado(asiento.estadoDocumento) }}
                </AppBadge>
              </RouterLink>
            </li>
          </ul>
          <EmptyState
            v-else
            titulo="Registración al día"
            mensaje="No hay asientos propuestos pendientes de registración."
            compacto
          >
            <template #icono>
              <ClipboardCheck :size="22" />
            </template>
          </EmptyState>

          <template #pie>
            <RouterLink
              class="dashboard-enlace"
              :to="{ name: 'contaduria', query: { vista: 'asientos' } }"
            >
              Ver asientos contables
              <ArrowRight :size="14" aria-hidden="true" />
            </RouterLink>
          </template>
        </AppCard>
      </div>
    </div>
  </section>
</template>
