<script setup lang="ts">
import {
  ArrowRight,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Landmark,
  Library,
  ListChecks,
  Play,
  Presentation,
  ReceiptText,
  Route,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Workflow,
} from '@lucide/vue'
import { computed, type Component } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { EstadoPaso, OpcionSelect, TipoBadge } from '@/components/ui/tipos'
import { etiquetaEstadoDocumento } from '@/core/contaduria'
import { formatearFecha, formatearMoneda } from '@/core/dinero'
import { construirRecorrido } from '@/core/recorrido'
import {
  construirTrazabilidad,
  listarOperacionesTrazables,
  type ClaveEtapaTrazabilidad,
  type TipoOperacionTrazabilidad,
} from '@/core/trazabilidad'
import { useContabilidadStore } from '@/stores/contabilidad'
import { useRecorridoStore } from '@/stores/recorrido'
import { useUiStore } from '@/stores/ui'

const contabilidad = useContabilidadStore()
const recorrido = useRecorridoStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const tipo = computed<TipoOperacionTrazabilidad>(() =>
  route.query.tipo === 'venta' ? 'venta' : 'compra',
)

const operaciones = computed(() => listarOperacionesTrazables(contabilidad.estado, tipo.value))

const operacionId = computed(() => {
  const solicitada = route.query.operacion
  if (typeof solicitada === 'string' && operaciones.value.some((item) => item.id === solicitada)) {
    return solicitada
  }

  const predeterminada = tipo.value === 'compra' ? 'C-001' : 'V-001'
  return (
    operaciones.value.find((item) => item.id === predeterminada)?.id ??
    operaciones.value[0]?.id ??
    ''
  )
})

const trazabilidad = computed(() =>
  operacionId.value
    ? construirTrazabilidad(contabilidad.estado, tipo.value, operacionId.value)
    : null,
)

const opcionesTipo: readonly OpcionSelect[] = [
  { valor: 'compra', etiqueta: 'Compra' },
  { valor: 'venta', etiqueta: 'Venta' },
]

const opcionesOperacion = computed<OpcionSelect[]>(() =>
  operaciones.value.map((operacion) => ({
    valor: operacion.id,
    etiqueta: `${operacion.numero} · ${operacion.contraparte} · ${formatearMoneda(operacion.importe)}`,
  })),
)

const pasos = computed(() =>
  construirRecorrido(contabilidad.estado, {
    compraId: tipo.value === 'compra' ? operacionId.value : null,
    ventaId: tipo.value === 'venta' ? operacionId.value : null,
  }),
)

const etapasEnlazadas = computed(
  () => trazabilidad.value?.etapas.filter((etapa) => Boolean(etapa.destino.path)).length ?? 0,
)

const etapaActual = computed(
  () => trazabilidad.value?.etapas.find((etapa) => etapa.estado === 'actual') ?? null,
)

const estadoRecorrido = computed(() => {
  switch (trazabilidad.value?.resumen.estado) {
    case 'completada':
      return {
        etiqueta: 'Circuito completo',
        descripcion: 'La operación completó las nueve etapas y llegó al balance.',
        tipo: 'exito' as TipoBadge,
      }
    case 'observada':
      return {
        etiqueta: 'Circuito observado',
        descripcion: 'Hay una etapa observada que debe revisarse antes de continuar.',
        tipo: 'error' as TipoBadge,
      }
    default:
      return {
        etiqueta: 'Circuito en curso',
        descripcion: etapaActual.value
          ? `La próxima acción ocurre en ${etapaActual.value.departamento}.`
          : 'La operación todavía tiene etapas pendientes.',
        tipo: 'advertencia' as TipoBadge,
      }
  }
})

const iconosEtapa: Record<ClaveEtapaTrazabilidad, Component> = {
  origen: ShoppingCart,
  documento: FileText,
  contaduria: ClipboardCheck,
  autorizacion: ShieldCheck,
  asiento: Calculator,
  diario: BookOpenCheck,
  mayor: Library,
  tesoreria: Landmark,
  balance: Scale,
}

function iconoEtapa(clave: ClaveEtapaTrazabilidad): Component {
  if (clave === 'origen' && tipo.value === 'venta') return ReceiptText
  return iconosEtapa[clave]
}

function etiquetaEstadoPaso(estado: EstadoPaso): string {
  switch (estado) {
    case 'completado':
      return 'Completada'
    case 'actual':
      return 'Etapa actual'
    case 'observado':
      return 'Observada'
    default:
      return 'Pendiente'
  }
}

function tipoBadgeEstadoPaso(estado: EstadoPaso): TipoBadge {
  switch (estado) {
    case 'completado':
      return 'exito'
    case 'actual':
      return 'marca'
    case 'observado':
      return 'error'
    default:
      return 'neutral'
  }
}

function tipoBadgeComercial(): TipoBadge {
  switch (trazabilidad.value?.estadoComercialClave) {
    case 'pagada':
    case 'cobrada':
      return 'exito'
    case 'parcial':
      return 'advertencia'
    default:
      return 'neutral'
  }
}

function cambiarTipo(valor: string): void {
  const siguiente = valor === 'venta' ? 'venta' : 'compra'
  void router.push({ name: 'trazabilidad', query: { tipo: siguiente } })
}

function cambiarOperacion(valor: string): void {
  void router.push({
    name: 'trazabilidad',
    query: { tipo: tipo.value, operacion: valor },
  })
}

function indiceInicio(): number {
  if (tipo.value === 'venta') return 10
  return trazabilidad.value?.documento.estado === 'registrado' ? 2 : 1
}

function iniciarRecorrido(desdeInicio = false): void {
  recorrido.abrir({
    indice: desdeInicio ? 0 : indiceInicio(),
    compraId: tipo.value === 'compra' ? operacionId.value : null,
    ventaId: tipo.value === 'venta' ? operacionId.value : null,
  })
}

function iniciarPresentacion(): void {
  ui.activarModoPresentacion()
  iniciarRecorrido(false)
}

function irAPaso(numero: number): void {
  recorrido.abrir({
    indice: numero - 1,
    compraId: tipo.value === 'compra' ? operacionId.value : null,
    ventaId: tipo.value === 'venta' ? operacionId.value : null,
  })
}

function abrirPantallaEtapa(): void {
  if (!etapaActual.value) return
  void router.push(etapaActual.value.destino)
}
</script>

<template>
  <section class="page trazabilidad">
    <div class="page__header">
      <div>
        <h2>Trazabilidad y recorrido guiado</h2>
        <p class="page__lead">
          Seguí una compra o una venta desde su origen comercial hasta el balance, con cada etapa
          enlazada a la pantalla donde ocurre.
        </p>
      </div>
      <div class="page__actions">
        <AppBadge :tipo="estadoRecorrido.tipo" punto>{{ estadoRecorrido.etiqueta }}</AppBadge>
        <AppButton variante="secundario" @click="ui.alternarModoPresentacion">
          <Presentation :size="16" aria-hidden="true" />
          {{ ui.modoPresentacion ? 'Salir de presentación' : 'Modo presentación' }}
        </AppButton>
        <AppButton @click="iniciarRecorrido(false)">
          <Play :size="16" aria-hidden="true" />
          Iniciar recorrido
        </AppButton>
      </div>
    </div>

    <AppCard compacta>
      <div class="trazabilidad__selector">
        <AppSelect
          label="Tipo de operación"
          :model-value="tipo"
          :opciones="opcionesTipo"
          @update:model-value="cambiarTipo"
        />
        <AppSelect
          label="Operación"
          :model-value="operacionId"
          :opciones="opcionesOperacion"
          placeholder="Seleccioná una operación"
          :disabled="opcionesOperacion.length === 0"
          @update:model-value="cambiarOperacion"
        />
        <div v-if="trazabilidad" class="trazabilidad__selector-resumen">
          <span class="texto-suave">Documento</span>
          <strong class="texto-mono">{{ trazabilidad.documento.numero }}</strong>
          <AppBadge :tipo="tipoBadgeComercial()">{{ trazabilidad.estadoComercial }}</AppBadge>
          <AppBadge :tipo="trazabilidad.estadoContable === 'registrado' ? 'exito' : 'info'">
            {{ etiquetaEstadoDocumento(trazabilidad.estadoContable) }}
          </AppBadge>
        </div>
      </div>
    </AppCard>

    <template v-if="trazabilidad">
      <div class="trazabilidad__resumen" aria-label="Resumen de la operación">
        <article class="trazabilidad__dato">
          <span class="trazabilidad__dato-icono" aria-hidden="true">
            <Route :size="17" />
          </span>
          <span>Avance del circuito</span>
          <strong>{{ trazabilidad.resumen.completadas }} / {{ trazabilidad.resumen.total }}</strong>
          <small>{{ trazabilidad.resumen.porcentaje }}% completado</small>
        </article>
        <article class="trazabilidad__dato">
          <span class="trazabilidad__dato-icono" aria-hidden="true">
            <Workflow :size="17" />
          </span>
          <span>Etapas enlazadas</span>
          <strong>{{ etapasEnlazadas }} / {{ trazabilidad.etapas.length }}</strong>
          <small>Cada etapa abre su pantalla</small>
        </article>
        <article class="trazabilidad__dato">
          <span class="trazabilidad__dato-icono" aria-hidden="true">
            <Landmark :size="17" />
          </span>
          <span>{{ tipo === 'compra' ? 'Pagos aplicados' : 'Cobros aplicados' }}</span>
          <strong>{{ trazabilidad.comprobantesTesoreria }}</strong>
          <small>Saldo {{ formatearMoneda(trazabilidad.saldoPendiente) }}</small>
        </article>
        <article class="trazabilidad__dato">
          <span class="trazabilidad__dato-icono" aria-hidden="true">
            <Calculator :size="17" />
          </span>
          <span>Importe de la operación</span>
          <strong class="texto-mono">{{ formatearMoneda(trazabilidad.importe) }}</strong>
          <small>{{ trazabilidad.contraparte }}</small>
        </article>
      </div>

      <AppCard
        titulo="Recorrido completo de la operación"
        descripcion="Nueve etapas desde el departamento de origen hasta los estados contables."
      >
        <template #acciones>
          <AppBadge :tipo="estadoRecorrido.tipo">{{ estadoRecorrido.etiqueta }}</AppBadge>
        </template>

        <div class="trazabilidad__progreso" aria-hidden="true">
          <span :style="{ width: `${trazabilidad.resumen.porcentaje}%` }" />
        </div>

        <ol class="trazabilidad__flujo">
          <li
            v-for="(etapa, indice) in trazabilidad.etapas"
            :key="etapa.clave"
            class="trazabilidad__etapa"
            :class="`trazabilidad__etapa--${etapa.estado}`"
          >
            <span
              class="trazabilidad__marca"
              :data-paso="String(indice + 1).padStart(2, '0')"
              aria-hidden="true"
            >
              <component :is="iconoEtapa(etapa.clave)" :size="17" />
            </span>

            <div class="trazabilidad__etapa-cuerpo">
              <div class="trazabilidad__etapa-cabecera">
                <div class="trazabilidad__etapa-titulo">
                  <strong>{{ etapa.titulo }}</strong>
                  <span>{{ etapa.departamento }}</span>
                </div>
                <AppBadge :tipo="tipoBadgeEstadoPaso(etapa.estado)">
                  {{ etiquetaEstadoPaso(etapa.estado) }}
                </AppBadge>
              </div>

              <p class="trazabilidad__etapa-descripcion">{{ etapa.descripcion }}</p>

              <div class="trazabilidad__etapa-pie">
                <dl class="trazabilidad__etapa-meta">
                  <div>
                    <dt>Fecha</dt>
                    <dd>{{ etapa.fecha ? formatearFecha(etapa.fecha) : '—' }}</dd>
                  </div>
                  <div>
                    <dt>Referencia</dt>
                    <dd>{{ etapa.referencia ?? '—' }}</dd>
                  </div>
                  <div>
                    <dt>Importe</dt>
                    <dd class="texto-mono">
                      {{ etapa.importe !== null ? formatearMoneda(etapa.importe) : '—' }}
                    </dd>
                  </div>
                </dl>

                <RouterLink
                  class="trazabilidad__enlace"
                  :to="etapa.destino"
                  :aria-label="`Abrir pantalla de ${etapa.departamento}`"
                >
                  Abrir pantalla
                  <ExternalLink :size="13" aria-hidden="true" />
                </RouterLink>
              </div>
            </div>
          </li>
        </ol>
      </AppCard>

      <div class="trazabilidad__columnas">
        <AppCard
          titulo="Verificación del circuito"
          descripcion="Control automático de la operación seleccionada."
        >
          <div
            class="trazabilidad__verificacion"
            :class="`trazabilidad__verificacion--${trazabilidad.resumen.estado}`"
          >
            <CheckCircle2
              v-if="trazabilidad.resumen.estado === 'completada'"
              :size="20"
              aria-hidden="true"
            />
            <CircleAlert v-else :size="20" aria-hidden="true" />
            <div>
              <strong>{{ estadoRecorrido.etiqueta }}</strong>
              <p>{{ estadoRecorrido.descripcion }}</p>
            </div>
          </div>

          <ul class="trazabilidad__checks">
            <li>
              <CheckCircle2 :size="15" aria-hidden="true" />
              Se construyeron las {{ trazabilidad.etapas.length }} etapas del circuito.
            </li>
            <li>
              <CheckCircle2 :size="15" aria-hidden="true" />
              Las {{ etapasEnlazadas }} etapas tienen una pantalla de destino.
            </li>
            <li>
              <CheckCircle2 :size="15" aria-hidden="true" />
              El documento, el asiento, el Mayor y el Balance están vinculados.
            </li>
            <li :class="{ 'trazabilidad__check--pendiente': trazabilidad.saldoPendiente > 0 }">
              <CheckCircle2 v-if="trazabilidad.saldoPendiente <= 0" :size="15" aria-hidden="true" />
              <CircleAlert v-else :size="15" aria-hidden="true" />
              {{
                trazabilidad.saldoPendiente <= 0
                  ? 'La obligación comercial está cancelada.'
                  : `Queda un saldo de ${formatearMoneda(trazabilidad.saldoPendiente)} en Tesorería.`
              }}
            </li>
          </ul>

          <template #pie>
            <AppButton
              variante="secundario"
              tamano="sm"
              :disabled="!etapaActual"
              @click="abrirPantallaEtapa"
            >
              Ir a la etapa actual
              <ArrowRight :size="15" aria-hidden="true" />
            </AppButton>
            <span class="texto-suave">
              {{ etapaActual ? etapaActual.titulo : 'Circuito completo' }}
            </span>
          </template>
        </AppCard>

        <AppCard
          titulo="Presentación sugerida"
          descripcion="Iniciá el recorrido de 13 pasos sin buscar pantallas manualmente."
        >
          <p class="trazabilidad__presentacion-texto">
            El recorrido sigue el criterio de aceptación: dashboard, compra, factura, pago,
            Contaduría, revisión, asiento, Diario, Mayor, Balance, venta, cobro y verificación
            contable.
          </p>

          <div class="trazabilidad__presentacion-acciones">
            <AppButton @click="iniciarPresentacion">
              <Presentation :size="16" aria-hidden="true" />
              Presentar desde esta operación
            </AppButton>
            <AppButton variante="secundario" @click="iniciarRecorrido(true)">
              <ListChecks :size="16" aria-hidden="true" />
              Recorrido completo
            </AppButton>
          </div>

          <p class="texto-suave">
            Atajos durante la presentación: ← y → cambian de paso, Escape cierra el recorrido.
          </p>
        </AppCard>
      </div>

      <AppCard
        titulo="Recorrido guiado de 13 pasos"
        descripcion="Criterio de aceptación final, enlazado a las operaciones seleccionadas."
      >
        <template #acciones>
          <AppBadge tipo="marca">{{ pasos.length }} pasos</AppBadge>
        </template>

        <ol class="trazabilidad__pasos">
          <li v-for="paso in pasos" :key="paso.clave" class="trazabilidad__paso">
            <span class="trazabilidad__paso-numero" aria-hidden="true">{{ paso.numero }}</span>
            <div class="trazabilidad__paso-texto">
              <strong>{{ paso.titulo }}</strong>
              <p>{{ paso.descripcion }}</p>
              <span class="texto-suave">{{ paso.departamento }}</span>
            </div>
            <AppButton variante="fantasma" tamano="sm" @click="irAPaso(paso.numero)">
              Ir al paso
              <ArrowRight :size="14" aria-hidden="true" />
            </AppButton>
          </li>
        </ol>
      </AppCard>
    </template>

    <EmptyState
      v-else
      titulo="Sin operaciones para trazar"
      mensaje="Registrá una compra o una venta para construir su recorrido completo."
    >
      <template #icono>
        <Route :size="22" />
      </template>
    </EmptyState>
  </section>
</template>

<style scoped>
.trazabilidad__selector {
  display: grid;
  grid-template-columns: minmax(160px, 0.7fr) minmax(280px, 1.4fr) minmax(260px, 1fr);
  align-items: end;
  gap: var(--espacio-4);
}

.trazabilidad__selector-resumen {
  display: flex;
  min-height: 38px;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-2);
}

.trazabilidad__selector-resumen strong {
  color: var(--color-texto);
  font-size: var(--texto-sm);
}

.trazabilidad__resumen {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--espacio-3);
}

.trazabilidad__dato {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px var(--espacio-3);
  padding: var(--espacio-4);
  border: var(--borde-fino);
  border-radius: var(--radio-md);
  background: var(--color-superficie);
  box-shadow: var(--sombra-xs);
}

.trazabilidad__dato-icono {
  display: grid;
  width: 34px;
  height: 34px;
  grid-row: span 3;
  place-items: center;
  border-radius: var(--radio-sm);
  background: var(--color-primario-suave);
  color: var(--color-primario);
}

.trazabilidad__dato > span:not(.trazabilidad__dato-icono) {
  color: var(--color-texto-suave);
  font-size: var(--texto-xs);
}

.trazabilidad__dato strong {
  color: var(--color-texto);
  font-size: var(--texto-xl);
  font-weight: var(--peso-semi);
  line-height: 1.1;
}

.trazabilidad__dato small {
  overflow: hidden;
  color: var(--color-texto-tenue);
  font-size: var(--texto-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trazabilidad__progreso {
  height: 5px;
  margin-bottom: var(--espacio-4);
  overflow: hidden;
  border-radius: var(--radio-completo);
  background: var(--color-fondo-alterno);
}

.trazabilidad__progreso span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primario), #7ba2ff);
  transition: width var(--transicion-base);
}

.trazabilidad__flujo {
  position: relative;
  display: grid;
}

.trazabilidad__flujo::before {
  position: absolute;
  top: 22px;
  bottom: 22px;
  left: 21px;
  width: 2px;
  background: var(--color-borde-suave);
  content: '';
}

.trazabilidad__etapa {
  position: relative;
  display: flex;
  gap: var(--espacio-3);
  padding-bottom: var(--espacio-3);
}

.trazabilidad__etapa:last-child {
  padding-bottom: 0;
}

.trazabilidad__marca {
  position: relative;
  z-index: 1;
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-completo);
  background: var(--color-superficie);
  color: var(--color-texto-suave);
  box-shadow: 0 0 0 4px var(--color-fondo);
}

.trazabilidad__marca::after {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-completo);
  background: var(--color-superficie);
  color: var(--color-texto-tenue);
  content: attr(data-paso);
  font-size: 8px;
  font-weight: var(--peso-semi);
  line-height: 1;
}

.trazabilidad__etapa--completado .trazabilidad__marca {
  border-color: var(--color-exito-borde);
  background: var(--color-exito-suave);
  color: var(--color-exito);
}

.trazabilidad__etapa--completado .trazabilidad__marca::after {
  border-color: var(--color-exito-borde);
  background: var(--color-superficie);
  color: var(--color-exito);
}

.trazabilidad__etapa--actual .trazabilidad__marca {
  border-color: var(--color-primario-borde);
  background: var(--color-superficie);
  color: var(--color-primario);
}

.trazabilidad__etapa--observado .trazabilidad__marca {
  border-color: var(--color-error-borde);
  background: var(--color-superficie);
  color: var(--color-error);
}

.trazabilidad__etapa-cuerpo {
  min-width: 0;
  flex: 1;
  padding: var(--espacio-3) var(--espacio-4);
  border: var(--borde-fino);
  border-radius: var(--radio-md);
  background: var(--color-superficie);
}

.trazabilidad__etapa--actual .trazabilidad__etapa-cuerpo {
  border-color: var(--color-primario-borde);
  background: var(--color-primario-suave);
}

.trazabilidad__etapa--observado .trazabilidad__etapa-cuerpo {
  border-color: var(--color-error-borde);
  background: var(--color-error-suave);
}

.trazabilidad__etapa-cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--espacio-2);
}

.trazabilidad__etapa-titulo {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px var(--espacio-2);
}

.trazabilidad__etapa-titulo strong {
  color: var(--color-texto);
  font-size: var(--texto-base);
  font-weight: var(--peso-semi);
}

.trazabilidad__etapa-titulo span {
  color: var(--color-texto-tenue);
  font-size: var(--texto-xs);
}

.trazabilidad__etapa-descripcion {
  margin-top: 3px;
  color: var(--color-texto-suave);
  font-size: var(--texto-sm);
  line-height: 1.45;
}

.trazabilidad__etapa-pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--espacio-2) var(--espacio-4);
  margin-top: var(--espacio-2);
}

.trazabilidad__etapa-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px var(--espacio-4);
}

.trazabilidad__etapa-meta div {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.trazabilidad__etapa-meta dt {
  color: var(--color-texto-tenue);
  font-size: 10px;
  text-transform: uppercase;
}

.trazabilidad__etapa-meta dd {
  color: var(--color-texto-suave);
  font-size: var(--texto-xs);
}

.trazabilidad__enlace {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--color-borde-suave);
  border-radius: var(--radio-completo);
  color: var(--color-primario);
  font-size: var(--texto-xs);
  font-weight: var(--peso-medio);
  white-space: nowrap;
}

.trazabilidad__enlace:hover {
  border-color: var(--color-primario-borde);
  background: var(--color-primario-suave);
  color: var(--color-primario-hover);
}

.trazabilidad__columnas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: var(--espacio-4);
}

.trazabilidad__verificacion {
  display: flex;
  align-items: flex-start;
  gap: var(--espacio-3);
  padding: var(--espacio-3);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-md);
  background: var(--color-superficie-suave);
  color: var(--color-texto-suave);
}

.trazabilidad__verificacion--completada {
  border-color: var(--color-exito-borde);
  background: var(--color-exito-suave);
  color: var(--color-exito);
}

.trazabilidad__verificacion--observada {
  border-color: var(--color-error-borde);
  background: var(--color-error-suave);
  color: var(--color-error);
}

.trazabilidad__verificacion strong {
  display: block;
  color: var(--color-texto);
  font-size: var(--texto-base);
}

.trazabilidad__verificacion p {
  margin-top: 2px;
  color: var(--color-texto-suave);
  font-size: var(--texto-sm);
}

.trazabilidad__checks {
  display: grid;
  gap: var(--espacio-2);
  margin-top: var(--espacio-4);
}

.trazabilidad__checks li {
  display: flex;
  align-items: flex-start;
  gap: var(--espacio-2);
  color: var(--color-texto-suave);
  font-size: var(--texto-sm);
}

.trazabilidad__checks svg {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--color-exito);
}

.trazabilidad__check--pendiente {
  color: var(--color-advertencia) !important;
}

.trazabilidad__check--pendiente svg {
  color: var(--color-advertencia);
}

.trazabilidad__presentacion-texto {
  color: var(--color-texto-suave);
  font-size: var(--texto-sm);
}

.trazabilidad__presentacion-acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espacio-2);
  margin: var(--espacio-4) 0 var(--espacio-3);
}

.trazabilidad__pasos {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px var(--espacio-2);
}

.trazabilidad__paso {
  display: flex;
  align-items: center;
  gap: var(--espacio-3);
  padding: var(--espacio-3);
  border: var(--borde-suave);
  border-radius: var(--radio-sm);
}

.trazabilidad__paso:hover {
  background: var(--color-superficie-suave);
}

.trazabilidad__paso-numero {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radio-completo);
  background: var(--color-primario-suave);
  color: var(--color-primario);
  font-size: var(--texto-xs);
  font-weight: var(--peso-semi);
}

.trazabilidad__paso-texto {
  min-width: 0;
  flex: 1;
}

.trazabilidad__paso-texto strong {
  color: var(--color-texto);
  font-size: var(--texto-base);
  font-weight: var(--peso-medio);
}

.trazabilidad__paso-texto p {
  color: var(--color-texto-suave);
  font-size: var(--texto-sm);
}

@media (max-width: 1100px) {
  .trazabilidad__selector {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trazabilidad__selector-resumen {
    grid-column: 1 / -1;
  }

  .trazabilidad__resumen {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trazabilidad__pasos {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .trazabilidad__columnas {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .trazabilidad__selector,
  .trazabilidad__resumen {
    grid-template-columns: 1fr;
  }

  .trazabilidad__flujo::before {
    left: 17px;
  }

  .trazabilidad__etapa {
    gap: var(--espacio-2);
  }

  .trazabilidad__marca {
    width: 36px;
    height: 36px;
  }

  .trazabilidad__etapa-cuerpo {
    padding: var(--espacio-2) var(--espacio-3);
  }

  .trazabilidad__etapa-cabecera,
  .trazabilidad__etapa-pie {
    align-items: flex-start;
    flex-direction: column;
  }

  .trazabilidad__paso {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
