<script setup lang="ts">
import { CheckCircle2, Eye, Library, Printer, Scale, XCircle } from '@lucide/vue'
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import DataTable from '@/components/ui/DataTable.vue'
import type { ColumnaTabla, TabItem, TipoBadge } from '@/components/ui/tipos'
import { formatearDiferencia, formatearFecha, formatearMoneda } from '@/core/dinero'
import { CODIGOS } from '@/data/plan-cuentas'
import { useContabilidadStore } from '@/stores/contabilidad'
import type { MayorCuenta, MovimientoMayor } from '@/types/contabilidad'

const contabilidad = useContabilidadStore()
const route = useRoute()
const router = useRouter()

type VistaBalances =
  | 'comprobacion'
  | 'situacion-patrimonial'
  | 'resultados'
  | 'flujo-efectivo'
  | 'evolucion-patrimonio'

const VISTAS: readonly VistaBalances[] = [
  'comprobacion',
  'situacion-patrimonial',
  'resultados',
  'flujo-efectivo',
  'evolucion-patrimonio',
]

function normalizarVista(valor: unknown): VistaBalances {
  return VISTAS.find((vista) => vista === valor) ?? 'comprobacion'
}

const vista = computed<VistaBalances>(() => normalizarVista(route.query.vista))

const tabs: TabItem[] = [
  { id: 'comprobacion', etiqueta: 'Balance de comprobación' },
  { id: 'situacion-patrimonial', etiqueta: 'Situación patrimonial' },
  { id: 'resultados', etiqueta: 'Estado de resultados' },
  { id: 'flujo-efectivo', etiqueta: 'Flujo de efectivo' },
  { id: 'evolucion-patrimonio', etiqueta: 'Evolución del patrimonio neto' },
]

function cambiarVista(id: string): void {
  void router.push({ name: 'balances', query: { vista: id } })
}

const balance = computed(() => contabilidad.balanceComprobacion)
const situacion = computed(() => contabilidad.estadoSituacionPatrimonial)
const resultados = computed(() => contabilidad.estadoResultados)
const flujo = computed(() => contabilidad.estadoFlujoEfectivo)
const evolucion = computed(() => contabilidad.estadoEvolucionPatrimonioNeto)
const coherencia = computed(() => contabilidad.coherenciaEstados)

const otrosIngresos = computed(() =>
  resultados.value.ingresos.filter((linea) => linea.codigo !== CODIGOS.VENTAS),
)

function tipoBadge(ok: boolean): TipoBadge {
  return ok ? 'exito' : 'error'
}

function formatearEgreso(importe: number): string {
  if (importe === 0) return formatearMoneda(0)
  return `(${formatearMoneda(Math.abs(importe))})`
}

function formatearFlujo(importe: number): string {
  return importe < 0 ? `(${formatearMoneda(Math.abs(importe))})` : formatearMoneda(importe)
}

function formatearResultado(importe: number): string {
  return importe < 0 ? `(${formatearMoneda(Math.abs(importe))})` : formatearMoneda(importe)
}

/* -------------------------------------------------------------------------- */
/* Balance de comprobación                                                    */
/* -------------------------------------------------------------------------- */

const columnasComprobacion: readonly ColumnaTabla[] = [
  { clave: 'codigo', titulo: 'Código', ancho: '90px' },
  { clave: 'nombre', titulo: 'Cuenta' },
  { clave: 'sumaDebe', titulo: 'Sumas Debe', alineacion: 'derecha' },
  { clave: 'sumaHaber', titulo: 'Sumas Haber', alineacion: 'derecha' },
  { clave: 'saldoDeudor', titulo: 'Saldo deudor', alineacion: 'derecha' },
  { clave: 'saldoAcreedor', titulo: 'Saldo acreedor', alineacion: 'derecha' },
  { clave: 'acciones', titulo: '', alineacion: 'derecha', ancho: '72px' },
]

const filasComprobacion = computed<Record<string, unknown>[]>(() =>
  balance.value.filas.map((fila) => ({
    id: fila.cuentaId,
    codigo: fila.codigo,
    nombre: fila.nombre,
    tipo: fila.tipo,
    naturaleza: fila.naturaleza,
    sumaDebe: formatearMoneda(fila.sumaDebe),
    sumaHaber: formatearMoneda(fila.sumaHaber),
    saldoDeudor: formatearMoneda(fila.saldoDeudor),
    saldoAcreedor: formatearMoneda(fila.saldoAcreedor),
  })),
)

const cuentaDetalle = ref<string | null>(null)

watch(
  () => route.query.cuenta,
  (valor) => {
    cuentaDetalle.value = typeof valor === 'string' && valor ? valor : null
  },
  { immediate: true },
)

const mayorDetalle = computed<MayorCuenta | undefined>(() =>
  cuentaDetalle.value ? contabilidad.libroMayor[cuentaDetalle.value] : undefined,
)

const filasDetalle = computed<Record<string, unknown>[]>(() =>
  (mayorDetalle.value?.movimientos ?? []).map((movimiento: MovimientoMayor, indice: number) => ({
    id: `${movimiento.asientoId}-${indice}`,
    fecha: formatearFecha(movimiento.fecha),
    numero: movimiento.numeroAsiento,
    concepto: movimiento.concepto,
    debe: formatearMoneda(movimiento.debe),
    haber: formatearMoneda(movimiento.haber),
    saldo: formatearMoneda(movimiento.saldo),
  })),
)

function abrirDetalleCuenta(codigo: string): void {
  cuentaDetalle.value = codigo
  if (route.query.cuenta === codigo) return
  void router.replace({
    name: 'balances',
    query: { ...route.query, vista: 'comprobacion', cuenta: codigo },
  })
}

function cerrarDetalleCuenta(): void {
  cuentaDetalle.value = null
  if (!route.query.cuenta) return
  const query = { ...route.query }
  delete query.cuenta
  void router.replace({ name: 'balances', query })
}

function irALibroMayor(): void {
  if (!cuentaDetalle.value) return
  const cuenta = cuentaDetalle.value
  cerrarDetalleCuenta()
  void router.push({ name: 'libros', query: { vista: 'mayor', cuenta } })
}

/* -------------------------------------------------------------------------- */
/* Impresión                                                                  */
/* -------------------------------------------------------------------------- */

async function imprimirEstado(): Promise<void> {
  await nextTick()
  if (typeof window.print !== 'function') return

  document.body.classList.add('imprimiendo-estados')
  const limpiar = (): void => {
    document.body.classList.remove('imprimiendo-estados')
    window.removeEventListener('afterprint', limpiar)
  }
  window.addEventListener('afterprint', limpiar)
  window.print()
}
</script>

<template>
  <section class="page balances" :class="`balances--${vista}`">
    <div class="page__header">
      <div>
        <h2>Balances y estados</h2>
        <p class="page__lead">
          Balance de comprobación y estados contables derivados exclusivamente de los asientos
          registrados. Cada cifra se concilia con el Libro Mayor y el Balance.
        </p>
      </div>
      <div class="page__actions balances__acciones">
        <AppBadge tipo="marca">{{ contabilidad.estado.periodo.etiqueta }}</AppBadge>
        <AppButton @click="imprimirEstado">
          <Printer :size="16" aria-hidden="true" />
          Imprimir estado
        </AppButton>
      </div>
    </div>

    <div class="balances__empresa">
      <strong>{{ contabilidad.estado.empresa.razonSocial }}</strong>
      <span>CUIT {{ contabilidad.estado.empresa.cuit }}</span>
      <span>{{ contabilidad.estado.empresa.actividad }}</span>
    </div>

    <div class="balances__coherencia">
      <AppBadge :tipo="tipoBadge(coherencia.balanceCierra)">
        <CheckCircle2 v-if="coherencia.balanceCierra" :size="13" aria-hidden="true" />
        <XCircle v-else :size="13" aria-hidden="true" />
        Balance de comprobación {{ coherencia.balanceCierra ? 'cerrado' : 'con diferencias' }}
      </AppBadge>
      <AppBadge :tipo="tipoBadge(coherencia.ecuacionPatrimonial)">
        <CheckCircle2 v-if="coherencia.ecuacionPatrimonial" :size="13" aria-hidden="true" />
        <XCircle v-else :size="13" aria-hidden="true" />
        Ecuación patrimonial {{ coherencia.ecuacionPatrimonial ? 'verificada' : 'con diferencias' }}
      </AppBadge>
      <AppBadge :tipo="tipoBadge(coherencia.resultadoCoincide)">
        <CheckCircle2 v-if="coherencia.resultadoCoincide" :size="13" aria-hidden="true" />
        <XCircle v-else :size="13" aria-hidden="true" />
        Resultado del ejercicio conciliado
      </AppBadge>
      <AppBadge :tipo="tipoBadge(coherencia.flujoConciliado)">
        <CheckCircle2 v-if="coherencia.flujoConciliado" :size="13" aria-hidden="true" />
        <XCircle v-else :size="13" aria-hidden="true" />
        Flujo de efectivo conciliado
      </AppBadge>
      <AppBadge :tipo="tipoBadge(coherencia.evolucionConciliada)">
        <CheckCircle2 v-if="coherencia.evolucionConciliada" :size="13" aria-hidden="true" />
        <XCircle v-else :size="13" aria-hidden="true" />
        Evolución del patrimonio conciliada
      </AppBadge>
    </div>

    <AppTabs :tabs="tabs" :model-value="vista" @update:model-value="cambiarVista">
      <!-- ===================== BALANCE DE COMPROBACIÓN ===================== -->
      <template #panel-comprobacion>
        <AppCard
          titulo="Balance de comprobación de sumas y saldos"
          descripcion="Surge de los saldos acumulados del Libro Mayor. Solo incluye cuentas imputables con actividad."
        >
          <div class="balances__resumen">
            <article class="balances__resumen-item">
              <span>Total sumas Debe</span>
              <strong class="texto-mono">{{ formatearMoneda(balance.totalSumaDebe) }}</strong>
            </article>
            <article class="balances__resumen-item">
              <span>Total sumas Haber</span>
              <strong class="texto-mono">{{ formatearMoneda(balance.totalSumaHaber) }}</strong>
            </article>
            <article class="balances__resumen-item">
              <span>Total saldos deudores</span>
              <strong class="texto-mono">{{ formatearMoneda(balance.totalSaldoDeudor) }}</strong>
            </article>
            <article class="balances__resumen-item">
              <span>Total saldos acreedores</span>
              <strong class="texto-mono">{{ formatearMoneda(balance.totalSaldoAcreedor) }}</strong>
            </article>
          </div>

          <DataTable
            :columnas="columnasComprobacion"
            :filas="filasComprobacion"
            :total="balance.filas.length"
            clave-fila="id"
            compacta
            vacio-titulo="Sin cuentas con actividad"
            vacio-mensaje="Registrá asientos para que el balance de comprobación muestre saldos."
          >
            <template #celda-nombre="{ fila }">
              <span class="balances__cuenta-nombre">{{ fila.nombre }}</span>
              <span class="balances__cuenta-meta">{{ fila.tipo }} · {{ fila.naturaleza }}</span>
            </template>
            <template #celda-sumaDebe="{ fila }">
              <span class="texto-mono">{{ fila.sumaDebe }}</span>
            </template>
            <template #celda-sumaHaber="{ fila }">
              <span class="texto-mono">{{ fila.sumaHaber }}</span>
            </template>
            <template #celda-saldoDeudor="{ fila }">
              <span class="texto-mono">{{ fila.saldoDeudor }}</span>
            </template>
            <template #celda-saldoAcreedor="{ fila }">
              <span class="texto-mono">{{ fila.saldoAcreedor }}</span>
            </template>
            <template #celda-acciones="{ fila }">
              <AppButton
                variante="secundario"
                tamano="sm"
                solo-icono
                aria-label="Consultar detalle de la cuenta"
                @click="abrirDetalleCuenta(String(fila.id))"
              >
                <Eye :size="14" aria-hidden="true" />
              </AppButton>
            </template>
          </DataTable>

          <div class="balances__totales">
            <div class="balances__total-fila">
              <span>Total sumas Debe</span>
              <strong class="texto-mono">{{ formatearMoneda(balance.totalSumaDebe) }}</strong>
            </div>
            <div class="balances__total-fila">
              <span>Total sumas Haber</span>
              <strong class="texto-mono">{{ formatearMoneda(balance.totalSumaHaber) }}</strong>
            </div>
            <div class="balances__total-fila">
              <span>Total saldos deudores</span>
              <strong class="texto-mono">{{ formatearMoneda(balance.totalSaldoDeudor) }}</strong>
            </div>
            <div class="balances__total-fila">
              <span>Total saldos acreedores</span>
              <strong class="texto-mono">{{ formatearMoneda(balance.totalSaldoAcreedor) }}</strong>
            </div>
            <div class="balances__total-fila balances__total-fila--verificacion">
              <span>Verificación Debe = Haber y deudores = acreedores</span>
              <AppBadge :tipo="tipoBadge(balance.balanceado)">
                {{ balance.balanceado ? 'Balanceado' : 'Diferencia' }}
              </AppBadge>
              <strong class="texto-mono">
                {{
                  formatearDiferencia(
                    balance.totalSaldoDeudor - balance.totalSaldoAcreedor ||
                      balance.totalSumaDebe - balance.totalSumaHaber,
                  )
                }}
              </strong>
            </div>
          </div>

          <p class="balances__nota">
            <Scale :size="14" aria-hidden="true" />
            El balance de comprobación no es un estado contable: verifica que las sumas y los saldos
            del Mayor cierren antes de preparar los estados.
          </p>
        </AppCard>
      </template>

      <!-- ===================== SITUACIÓN PATRIMONIAL ===================== -->
      <template #panel-situacion-patrimonial>
        <AppCard
          titulo="Estado de Situación Patrimonial"
          descripcion="Activo, pasivo y patrimonio neto al cierre del período."
        >
          <div class="estado">
            <div class="estado__bloque">
              <h4 class="estado__titulo-seccion">Activo corriente</h4>
              <div
                v-for="linea in situacion.activoCorriente"
                :key="linea.codigo"
                class="estado__fila"
              >
                <span class="estado__concepto">
                  <span class="texto-mono">{{ linea.codigo }}</span> — {{ linea.nombre }}
                </span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(linea.importe) }}
                </span>
              </div>
              <div class="estado__fila estado__fila--subtotal">
                <span class="estado__concepto">Total activo corriente</span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(situacion.totalActivoCorriente) }}
                </span>
              </div>
            </div>

            <div class="estado__bloque">
              <h4 class="estado__titulo-seccion">Activo no corriente</h4>
              <div
                v-for="linea in situacion.activoNoCorriente"
                :key="linea.codigo"
                class="estado__fila"
              >
                <span class="estado__concepto">
                  <span class="texto-mono">{{ linea.codigo }}</span> — {{ linea.nombre }}
                </span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(linea.importe) }}
                </span>
              </div>
              <div class="estado__fila estado__fila--subtotal">
                <span class="estado__concepto">Total activo no corriente</span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(situacion.totalActivoNoCorriente) }}
                </span>
              </div>
            </div>

            <div class="estado__fila estado__fila--total">
              <span class="estado__concepto">TOTAL DEL ACTIVO</span>
              <span class="estado__importe texto-mono">
                {{ formatearMoneda(situacion.totalActivo) }}
              </span>
            </div>

            <div class="estado__bloque">
              <h4 class="estado__titulo-seccion">Pasivo corriente</h4>
              <div
                v-for="linea in situacion.pasivoCorriente"
                :key="linea.codigo"
                class="estado__fila"
              >
                <span class="estado__concepto">
                  <span class="texto-mono">{{ linea.codigo }}</span> — {{ linea.nombre }}
                </span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(linea.importe) }}
                </span>
              </div>
              <div class="estado__fila estado__fila--subtotal">
                <span class="estado__concepto">Total pasivo corriente</span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(situacion.totalPasivoCorriente) }}
                </span>
              </div>
            </div>

            <div class="estado__bloque">
              <h4 class="estado__titulo-seccion">Pasivo no corriente</h4>
              <div
                v-for="linea in situacion.pasivoNoCorriente"
                :key="linea.codigo"
                class="estado__fila"
              >
                <span class="estado__concepto">
                  <span class="texto-mono">{{ linea.codigo }}</span> — {{ linea.nombre }}
                </span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(linea.importe) }}
                </span>
              </div>
              <div class="estado__fila estado__fila--subtotal">
                <span class="estado__concepto">Total pasivo no corriente</span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(situacion.totalPasivoNoCorriente) }}
                </span>
              </div>
            </div>

            <div class="estado__fila estado__fila--total">
              <span class="estado__concepto">TOTAL DEL PASIVO</span>
              <span class="estado__importe texto-mono">
                {{ formatearMoneda(situacion.totalPasivo) }}
              </span>
            </div>

            <div class="estado__bloque">
              <h4 class="estado__titulo-seccion">Patrimonio neto</h4>
              <div
                v-for="linea in situacion.patrimonioNeto"
                :key="linea.codigo"
                class="estado__fila"
              >
                <span class="estado__concepto">
                  <span class="texto-mono">{{ linea.codigo }}</span> — {{ linea.nombre }}
                </span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(linea.importe) }}
                </span>
              </div>
              <div class="estado__fila estado__fila--subtotal">
                <span class="estado__concepto">Total patrimonio neto</span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(situacion.totalPatrimonioNeto) }}
                </span>
              </div>
            </div>

            <div class="estado__fila estado__fila--total">
              <span class="estado__concepto">TOTAL PASIVO + PATRIMONIO NETO</span>
              <span class="estado__importe texto-mono">
                {{ formatearMoneda(situacion.totalPasivoYPatrimonioNeto) }}
              </span>
            </div>

            <div class="estado__verificacion">
              <span>Verificación Activo = Pasivo + Patrimonio Neto</span>
              <AppBadge :tipo="tipoBadge(situacion.ecuacionVerificada)">
                {{ situacion.ecuacionVerificada ? 'Verificada' : 'Con diferencia' }}
              </AppBadge>
              <strong class="texto-mono">
                {{ formatearDiferencia(situacion.diferencia) }}
              </strong>
            </div>
          </div>
        </AppCard>
      </template>

      <!-- ===================== ESTADO DE RESULTADOS ===================== -->
      <template #panel-resultados>
        <AppCard
          titulo="Estado de Resultados"
          descripcion="Ingresos, costos, gastos y resultado del ejercicio."
        >
          <div class="estado">
            <div class="estado__bloque">
              <h4 class="estado__titulo-seccion">Ingresos</h4>
              <div class="estado__fila">
                <span class="estado__concepto">Ventas netas</span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(resultados.ventasNetas) }}
                </span>
              </div>
              <div v-for="linea in otrosIngresos" :key="linea.codigo" class="estado__fila">
                <span class="estado__concepto">
                  <span class="texto-mono">{{ linea.codigo }}</span> — {{ linea.nombre }}
                </span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(linea.importe) }}
                </span>
              </div>
              <div class="estado__fila estado__fila--subtotal">
                <span class="estado__concepto">Total ingresos</span>
                <span class="estado__importe texto-mono">
                  {{ formatearMoneda(resultados.totalIngresos) }}
                </span>
              </div>
            </div>

            <div class="estado__fila">
              <span class="estado__concepto">Costo de ventas</span>
              <span class="estado__importe estado__importe--egreso texto-mono">
                {{ formatearEgreso(resultados.costoVentas) }}
              </span>
            </div>
            <div class="estado__fila estado__fila--subtotal">
              <span class="estado__concepto">Resultado bruto</span>
              <span class="estado__importe texto-mono">
                {{ formatearResultado(resultados.resultadoBruto) }}
              </span>
            </div>

            <div class="estado__bloque">
              <h4 class="estado__titulo-seccion">Gastos operativos</h4>
              <div
                v-for="linea in resultados.gastosOperativos"
                :key="linea.codigo"
                class="estado__fila"
              >
                <span class="estado__concepto">
                  <span class="texto-mono">{{ linea.codigo }}</span> — {{ linea.nombre }}
                </span>
                <span class="estado__importe estado__importe--egreso texto-mono">
                  {{ formatearEgreso(linea.importe) }}
                </span>
              </div>
              <div class="estado__fila estado__fila--subtotal">
                <span class="estado__concepto">Total gastos operativos</span>
                <span class="estado__importe estado__importe--egreso texto-mono">
                  {{ formatearEgreso(resultados.totalGastosOperativos) }}
                </span>
              </div>
            </div>

            <div class="estado__fila estado__fila--subtotal">
              <span class="estado__concepto">Resultado operativo</span>
              <span class="estado__importe texto-mono">
                {{ formatearResultado(resultados.resultadoOperativo) }}
              </span>
            </div>
            <div class="estado__fila estado__fila--subtotal">
              <span class="estado__concepto">Resultado antes de impuestos</span>
              <span class="estado__importe texto-mono">
                {{ formatearResultado(resultados.resultadoAntesImpuestos) }}
              </span>
            </div>
            <div class="estado__fila">
              <span class="estado__concepto">Impuesto a las ganancias</span>
              <span class="estado__importe estado__importe--egreso texto-mono">
                {{ formatearEgreso(resultados.impuestoGanancias) }}
              </span>
            </div>

            <div class="estado__fila estado__fila--total">
              <span class="estado__concepto">RESULTADO DEL EJERCICIO</span>
              <span class="estado__importe texto-mono">
                {{ formatearResultado(resultados.resultadoEjercicio) }}
              </span>
            </div>

            <div class="estado__verificacion">
              <span>Resultado conciliado con el Estado de Situación Patrimonial</span>
              <AppBadge :tipo="tipoBadge(coherencia.resultadoCoincide)">
                {{ coherencia.resultadoCoincide ? 'Verificado' : 'Con diferencia' }}
              </AppBadge>
            </div>
          </div>
        </AppCard>
      </template>

      <!-- ===================== FLUJO DE EFECTIVO ===================== -->
      <template #panel-flujo-efectivo>
        <AppCard
          titulo="Estado de Flujo de Efectivo"
          descripcion="Método directo. Caja y banco surgen de los asientos registrados; las transferencias internas no generan flujo."
        >
          <div class="estado estado--flujo">
            <div class="estado__fila estado__fila--subtotal">
              <span class="estado__concepto">Efectivo al inicio del período</span>
              <span class="estado__importe texto-mono">
                {{ formatearMoneda(flujo.saldoInicial) }}
              </span>
            </div>

            <div class="estado__bloque">
              <h4 class="estado__titulo-seccion">Actividades operativas</h4>
              <div
                v-for="linea in flujo.actividadesOperativas"
                :key="linea.codigo"
                class="estado__fila"
              >
                <span class="estado__concepto">{{ linea.nombre }}</span>
                <span class="estado__importe texto-mono">
                  {{ formatearFlujo(linea.importe) }}
                </span>
              </div>
              <div class="estado__fila estado__fila--subtotal">
                <span class="estado__concepto">Flujo neto de actividades operativas</span>
                <span class="estado__importe texto-mono">
                  {{ formatearFlujo(flujo.totalActividadesOperativas) }}
                </span>
              </div>
            </div>

            <div class="estado__bloque">
              <h4 class="estado__titulo-seccion">Actividades de inversión</h4>
              <div
                v-for="linea in flujo.actividadesInversion"
                :key="linea.codigo"
                class="estado__fila"
              >
                <span class="estado__concepto">{{ linea.nombre }}</span>
                <span class="estado__importe texto-mono">
                  {{ formatearFlujo(linea.importe) }}
                </span>
              </div>
              <div class="estado__fila estado__fila--subtotal">
                <span class="estado__concepto">Flujo neto de actividades de inversión</span>
                <span class="estado__importe texto-mono">
                  {{ formatearFlujo(flujo.totalActividadesInversion) }}
                </span>
              </div>
            </div>

            <div class="estado__bloque">
              <h4 class="estado__titulo-seccion">Actividades de financiación</h4>
              <div
                v-for="linea in flujo.actividadesFinanciacion"
                :key="linea.codigo"
                class="estado__fila"
              >
                <span class="estado__concepto">{{ linea.nombre }}</span>
                <span class="estado__importe texto-mono">
                  {{ formatearFlujo(linea.importe) }}
                </span>
              </div>
              <div class="estado__fila estado__fila--subtotal">
                <span class="estado__concepto">Flujo neto de actividades de financiación</span>
                <span class="estado__importe texto-mono">
                  {{ formatearFlujo(flujo.totalActividadesFinanciacion) }}
                </span>
              </div>
            </div>

            <div class="estado__fila estado__fila--subtotal">
              <span class="estado__concepto">Variación neta del efectivo</span>
              <span class="estado__importe texto-mono">
                {{ formatearFlujo(flujo.variacionNeta) }}
              </span>
            </div>
            <div class="estado__fila estado__fila--total">
              <span class="estado__concepto">EFECTIVO AL CIERRE DEL PERÍODO</span>
              <span class="estado__importe texto-mono">
                {{ formatearMoneda(flujo.saldoFinal) }}
              </span>
            </div>

            <div class="estado__verificacion">
              <span>Conciliación con caja y banco del Balance</span>
              <AppBadge :tipo="tipoBadge(flujo.conciliado)">
                {{ flujo.conciliado ? 'Conciliado' : 'Con diferencia' }}
              </AppBadge>
              <strong class="texto-mono">
                Saldo contable {{ formatearMoneda(flujo.saldoContable) }} ·
                {{ formatearDiferencia(flujo.diferencia) }}
              </strong>
            </div>

            <p class="balances__nota">
              <Library :size="14" aria-hidden="true" />
              La apertura se expone como efectivo inicial. Los cobros, pagos, gastos e impuestos se
              clasifican como operativos; las compras de bienes de uso como inversión y los aportes
              o préstamos como financiación.
            </p>
          </div>
        </AppCard>
      </template>

      <!-- ===================== EVOLUCIÓN DEL PATRIMONIO NETO ===================== -->
      <template #panel-evolucion-patrimonio>
        <AppCard
          titulo="Estado de Evolución del Patrimonio Neto"
          descripcion="Movimientos del capital, resultados acumulados y resultado del ejercicio."
        >
          <div class="estado estado--evolucion">
            <div
              class="balances__tabla-scroll"
              role="region"
              aria-label="Tabla de evolución del patrimonio neto"
              tabindex="0"
            >
              <table class="estado-tabla">
                <thead>
                  <tr>
                    <th scope="col">Concepto</th>
                    <th scope="col" class="estado-tabla__numero">Capital</th>
                    <th scope="col" class="estado-tabla__numero">Resultados acumulados</th>
                    <th scope="col" class="estado-tabla__numero">Resultado del ejercicio</th>
                    <th scope="col" class="estado-tabla__numero">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="fila in evolucion.filas"
                    :key="fila.concepto"
                    :class="`estado-tabla__fila--${fila.tipo}`"
                  >
                    <th scope="row">{{ fila.concepto }}</th>
                    <td class="texto-mono">{{ formatearResultado(fila.capital) }}</td>
                    <td class="texto-mono">
                      {{ formatearResultado(fila.resultadosAcumulados) }}
                    </td>
                    <td class="texto-mono">{{ formatearResultado(fila.resultadoEjercicio) }}</td>
                    <td class="texto-mono">{{ formatearResultado(fila.total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="estado__verificacion">
              <span>Conciliación con el Patrimonio Neto del Estado de Situación Patrimonial</span>
              <AppBadge :tipo="tipoBadge(evolucion.conciliado)">
                {{ evolucion.conciliado ? 'Conciliado' : 'Con diferencia' }}
              </AppBadge>
              <strong class="texto-mono">
                Patrimonio neto {{ formatearMoneda(evolucion.totalPatrimonioNeto) }} ·
                {{ formatearDiferencia(evolucion.diferencia) }}
              </strong>
            </div>

            <p class="balances__nota">
              <Scale :size="14" aria-hidden="true" />
              El resultado del ejercicio se incorpora desde el Estado de Resultados para conciliar
              la evolución con el Patrimonio Neto. No se generan asientos de cierre automáticos.
            </p>
          </div>
        </AppCard>
      </template>
    </AppTabs>

    <!-- Detalle de cuenta del Balance -->
    <AppModal
      :model-value="Boolean(mayorDetalle)"
      :titulo="
        mayorDetalle
          ? `Cuenta ${mayorDetalle.cuenta.codigo} — ${mayorDetalle.cuenta.nombre}`
          : 'Detalle de cuenta'
      "
      descripcion="Movimientos del Libro Mayor que explican el saldo del Balance de Comprobación."
      tamano="lg"
      @update:model-value="
        (abierto) => {
          if (!abierto) cerrarDetalleCuenta()
        }
      "
    >
      <template v-if="mayorDetalle">
        <div class="balances__detalle-resumen">
          <article class="balances__resumen-item">
            <span>Saldo inicial</span>
            <strong class="texto-mono">{{ formatearMoneda(mayorDetalle.saldoInicial) }}</strong>
          </article>
          <article class="balances__resumen-item">
            <span>Total Debe</span>
            <strong class="texto-mono">{{ formatearMoneda(mayorDetalle.totalDebe) }}</strong>
          </article>
          <article class="balances__resumen-item">
            <span>Total Haber</span>
            <strong class="texto-mono">{{ formatearMoneda(mayorDetalle.totalHaber) }}</strong>
          </article>
          <article class="balances__resumen-item balances__resumen-item--final">
            <span>Saldo final</span>
            <strong class="texto-mono">{{ formatearMoneda(mayorDetalle.saldoFinal) }}</strong>
          </article>
        </div>

        <p class="texto-suave balances__detalle-meta">
          Naturaleza {{ mayorDetalle.cuenta.naturaleza }} · Tipo {{ mayorDetalle.cuenta.tipo }} ·
          {{ mayorDetalle.movimientos.length }} movimientos registrados.
        </p>

        <DataTable
          :columnas="[
            { clave: 'fecha', titulo: 'Fecha', ancho: '92px' },
            { clave: 'numero', titulo: 'Nº asiento', ancho: '84px' },
            { clave: 'concepto', titulo: 'Concepto' },
            { clave: 'debe', titulo: 'Debe', alineacion: 'derecha' },
            { clave: 'haber', titulo: 'Haber', alineacion: 'derecha' },
            { clave: 'saldo', titulo: 'Saldo', alineacion: 'derecha' },
          ]"
          :filas="filasDetalle"
          :total="filasDetalle.length"
          clave-fila="id"
          compacta
          vacio-titulo="Sin movimientos"
          vacio-mensaje="La cuenta no registra movimientos en el período."
        >
          <template #celda-fecha="{ fila }">{{ fila.fecha }}</template>
          <template #celda-numero="{ fila }">{{ fila.numero }}</template>
          <template #celda-concepto="{ fila }">{{ fila.concepto }}</template>
          <template #celda-debe="{ fila }">{{ fila.debe }}</template>
          <template #celda-haber="{ fila }">{{ fila.haber }}</template>
          <template #celda-saldo="{ fila }">{{ fila.saldo }}</template>
        </DataTable>
      </template>

      <template #pie>
        <AppButton variante="secundario" @click="cerrarDetalleCuenta">Cerrar</AppButton>
        <AppButton @click="irALibroMayor">Abrir en Libro Mayor</AppButton>
      </template>
    </AppModal>
  </section>
</template>

<style scoped>
.balances__empresa {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: baseline;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border: 1px solid var(--color-borde, #e2e8f0);
  border-radius: 0.5rem;
  background: var(--color-superficie-suave, #f8fafc);
  color: var(--color-texto-suave, #475569);
  font-size: 0.875rem;
}

.balances__empresa strong {
  color: var(--color-texto, #0f172a);
}

.balances__coherencia {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.balances__coherencia .ui-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.balances__resumen,
.balances__detalle-resumen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.balances__resumen-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  border: 1px solid var(--color-borde, #e2e8f0);
  border-radius: 0.5rem;
}

.balances__resumen-item--final {
  border-color: var(--color-marca, #2563eb);
}

.balances__cuenta-nombre {
  display: block;
  font-weight: 600;
}

.balances__cuenta-meta {
  display: block;
  color: var(--color-texto-suave, #64748b);
  font-size: 0.75rem;
  text-transform: capitalize;
}

.balances__totales {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-borde, #e2e8f0);
}

.balances__total-fila {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.balances__total-fila--verificacion {
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.balances__nota,
.balances__detalle-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.balances__tabla-scroll {
  overflow-x: auto;
}

/* Estados contables ------------------------------------------------------- */
.estado {
  max-width: 960px;
}

.estado__bloque {
  margin-bottom: 1rem;
}

.estado__titulo-seccion {
  margin: 0 0 0.5rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--color-borde, #e2e8f0);
  font-size: 0.82rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-texto-suave, #475569);
}

.estado__fila {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding: 0.4rem 0.25rem;
  border-bottom: 1px dashed var(--color-borde, #e2e8f0);
}

.estado__concepto {
  min-width: 0;
}

.estado__importe {
  flex: 0 0 auto;
  text-align: right;
  white-space: nowrap;
}

.estado__importe--egreso {
  color: var(--color-peligro, #b91c1c);
}

.estado__fila--subtotal {
  font-weight: 600;
  background: var(--color-superficie-suave, #f8fafc);
  border-bottom-style: solid;
}

.estado__fila--total {
  margin-top: 0.5rem;
  padding: 0.65rem 0.35rem;
  font-weight: 700;
  border-top: 2px solid var(--color-texto, #0f172a);
  border-bottom: 2px double var(--color-texto, #0f172a);
}

.estado__verificacion {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: var(--color-superficie-suave, #f8fafc);
  border: 1px solid var(--color-borde, #e2e8f0);
}

.estado-tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.estado-tabla th,
.estado-tabla td {
  padding: 0.55rem 0.6rem;
  border-bottom: 1px solid var(--color-borde, #e2e8f0);
  text-align: left;
}

.estado-tabla thead th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-texto-suave, #475569);
}

.estado-tabla__numero {
  text-align: right !important;
  white-space: nowrap;
}

.estado-tabla__fila--saldo_inicial {
  background: var(--color-superficie-suave, #f8fafc);
}

.estado-tabla__fila--resultado {
  font-weight: 600;
}

.estado-tabla__fila--saldo_final th,
.estado-tabla__fila--saldo_final td {
  font-weight: 700;
  border-top: 2px solid var(--color-texto, #0f172a);
  border-bottom: 2px double var(--color-texto, #0f172a);
}

@media (max-width: 640px) {
  .estado__fila {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.15rem;
  }

  .estado__importe {
    align-self: flex-end;
  }
}

@media print {
  .balances__acciones,
  .balances__coherencia,
  .balances__empresa,
  .balances__nota,
  .balances__detalle-meta {
    display: none !important;
  }

  .balances :deep(.ui-tabs__lista) {
    display: none !important;
  }

  .balances :deep(.ui-card) {
    border: 0;
    box-shadow: none;
    padding: 0;
  }

  .estado {
    max-width: none;
  }

  .estado__bloque,
  .estado__fila,
  .estado__verificacion,
  .estado-tabla tr {
    break-inside: avoid;
  }

  .balances__tabla-scroll {
    overflow: visible;
  }
}
</style>
