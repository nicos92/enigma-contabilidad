<script setup lang="ts">
import {
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Menu,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  UserRound,
} from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useClickOutside } from '@/composables/useClickOutside'
import { DESTINOS_BUSQUEDA, migasDeRuta, type DestinoBusqueda } from '@/config/navegacion'
import { formatearMoneda } from '@/core/dinero'
import { useAppStore } from '@/stores/app'
import { useContabilidadStore } from '@/stores/contabilidad'
import { useUiStore } from '@/stores/ui'
import type { TipoDocumento } from '@/types/contabilidad'

const app = useAppStore()
const contabilidad = useContabilidadStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const migas = computed(() => migasDeRuta(route.path, route.query.vista))
const tituloPagina = computed(() => route.meta.titulo ?? app.nombreProducto)
const inicialesUsuario = computed(() =>
  app.usuario.nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join(''),
)
const totalPendientes = computed(() => contabilidad.documentosPendientes.length)
const etiquetasDocumento: Record<TipoDocumento, string> = {
  factura_recibida: 'Factura recibida',
  factura_emitida: 'Factura emitida',
  comprobante_pago: 'Comprobante de pago',
  recibo: 'Recibo',
  transferencia: 'Transferencia',
  asiento_apertura: 'Asiento de apertura',
  asiento_ajuste: 'Asiento de ajuste',
  liquidacion_iva: 'Liquidación de IVA',
  provision_impuesto: 'Provisión de impuesto',
}

/* Búsqueda ---------------------------------------------------------------- */
const consulta = ref('')
const busquedaAbierta = ref(false)
const indiceActivo = ref(0)
const refBusqueda = ref<HTMLElement | null>(null)
const inputBusqueda = ref<HTMLInputElement | null>(null)

const resultados = computed<DestinoBusqueda[]>(() => {
  const termino = consulta.value.trim().toLocaleLowerCase('es')
  if (!termino) return []
  return DESTINOS_BUSQUEDA.filter((destino) => {
    const texto = `${destino.etiqueta} ${destino.grupo} ${destino.descripcion}`.toLocaleLowerCase(
      'es',
    )
    return texto.includes(termino)
  }).slice(0, 8)
})

watch(resultados, () => {
  indiceActivo.value = 0
})

function cerrarBusqueda(): void {
  busquedaAbierta.value = false
}

useClickOutside(refBusqueda, cerrarBusqueda)

function abrirResultado(destino: DestinoBusqueda | undefined): void {
  if (!destino) return
  void router.push(destino.to)
  consulta.value = ''
  busquedaAbierta.value = false
  inputBusqueda.value?.blur()
}

function alTeclearBusqueda(evento: KeyboardEvent): void {
  if (evento.key === 'ArrowDown') {
    evento.preventDefault()
    busquedaAbierta.value = true
    if (resultados.value.length > 0) {
      indiceActivo.value = (indiceActivo.value + 1) % resultados.value.length
    }
  } else if (evento.key === 'ArrowUp') {
    evento.preventDefault()
    if (resultados.value.length > 0) {
      indiceActivo.value =
        (indiceActivo.value - 1 + resultados.value.length) % resultados.value.length
    }
  } else if (evento.key === 'Enter') {
    evento.preventDefault()
    abrirResultado(resultados.value[indiceActivo.value] ?? resultados.value[0])
  } else if (evento.key === 'Escape') {
    evento.preventDefault()
    busquedaAbierta.value = false
    inputBusqueda.value?.blur()
  }
}

function atajoGlobal(evento: KeyboardEvent): void {
  const destino = evento.target
  const enCampo =
    destino instanceof HTMLElement &&
    (destino.tagName === 'INPUT' ||
      destino.tagName === 'TEXTAREA' ||
      destino.tagName === 'SELECT' ||
      destino.isContentEditable)

  const esAtajoBusqueda =
    (evento.key === 'k' && (evento.ctrlKey || evento.metaKey)) || (evento.key === '/' && !enCampo)

  if (!esAtajoBusqueda) return
  evento.preventDefault()
  void nextTick(() => inputBusqueda.value?.focus())
}

/* Notificaciones ---------------------------------------------------------- */
const refNotificaciones = ref<HTMLElement | null>(null)
const notificacionesAbiertas = ref(false)

useClickOutside(refNotificaciones, () => {
  notificacionesAbiertas.value = false
})

function alternarNotificaciones(): void {
  notificacionesAbiertas.value = !notificacionesAbiertas.value
  usuarioAbierto.value = false
}

/* Menú de usuario --------------------------------------------------------- */
const refUsuario = ref<HTMLElement | null>(null)
const usuarioAbierto = ref(false)

useClickOutside(refUsuario, () => {
  usuarioAbierto.value = false
})

function alternarUsuario(): void {
  usuarioAbierto.value = !usuarioAbierto.value
  notificacionesAbiertas.value = false
}

onMounted(() => window.addEventListener('keydown', atajoGlobal))
onBeforeUnmount(() => window.removeEventListener('keydown', atajoGlobal))
</script>

<template>
  <header class="app-topbar">
    <button
      type="button"
      class="app-icono-boton app-topbar__colapsar"
      :aria-label="ui.sidebarColapsada ? 'Expandir menú lateral' : 'Colapsar menú lateral'"
      @click="ui.alternarSidebar"
    >
      <PanelLeftOpen v-if="ui.sidebarColapsada" :size="19" aria-hidden="true" />
      <PanelLeftClose v-else :size="19" aria-hidden="true" />
    </button>

    <button
      type="button"
      class="app-topbar__menu"
      :aria-expanded="ui.sidebarMovilAbierta"
      aria-label="Abrir menú de navegación"
      @click="ui.alternarMenuMovil"
    >
      <Menu :size="19" aria-hidden="true" />
    </button>

    <div class="app-topbar__izquierda">
      <nav class="app-breadcrumb" aria-label="Ubicación">
        <RouterLink to="/dashboard" class="app-breadcrumb__inicio" aria-label="Ir al panel general">
          <LayoutDashboard :size="13" aria-hidden="true" />
        </RouterLink>
        <template v-for="(miga, indice) in migas" :key="`${miga.etiqueta}-${indice}`">
          <span class="app-breadcrumb__separador" aria-hidden="true">/</span>
          <RouterLink
            v-if="miga.to && indice < migas.length - 1"
            :to="miga.to"
            class="app-breadcrumb__actual"
          >
            {{ miga.etiqueta }}
          </RouterLink>
          <span v-else class="app-breadcrumb__actual" aria-current="page">
            {{ miga.etiqueta }}
          </span>
        </template>
      </nav>
      <h1 class="app-topbar__title">{{ tituloPagina }}</h1>
    </div>

    <div class="app-topbar__derecha">
      <div ref="refBusqueda" class="app-busqueda">
        <div class="app-busqueda__campo">
          <Search :size="16" aria-hidden="true" />
          <input
            ref="inputBusqueda"
            v-model="consulta"
            type="search"
            placeholder="Buscar módulo o sección"
            aria-label="Buscar módulo o sección"
            role="combobox"
            aria-autocomplete="list"
            :aria-expanded="busquedaAbierta"
            aria-controls="resultados-busqueda"
            @focus="busquedaAbierta = true"
            @keydown="alTeclearBusqueda"
          />
          <span class="app-busqueda__atajo" aria-hidden="true">Ctrl K</span>
        </div>

        <div
          v-if="busquedaAbierta"
          id="resultados-busqueda"
          class="app-busqueda__resultados"
          role="listbox"
          aria-label="Resultados de búsqueda"
        >
          <template v-if="resultados.length > 0">
            <button
              v-for="(resultado, indice) in resultados"
              :key="`${resultado.grupo}-${resultado.etiqueta}`"
              type="button"
              class="app-busqueda__opcion"
              :class="{ 'app-busqueda__opcion--activa': indice === indiceActivo }"
              role="option"
              :aria-selected="indice === indiceActivo"
              @mouseenter="indiceActivo = indice"
              @click="abrirResultado(resultado)"
            >
              <span class="app-busqueda__opcion-icono" aria-hidden="true">
                <component :is="resultado.icono" :size="16" />
              </span>
              <span class="app-busqueda__opcion-texto">
                <strong>{{ resultado.etiqueta }}</strong>
                <small>{{ resultado.grupo }} · {{ resultado.descripcion }}</small>
              </span>
            </button>
          </template>
          <p v-else class="app-busqueda__vacio">
            {{ consulta ? 'No se encontraron secciones.' : 'Escribí para buscar un módulo.' }}
          </p>
        </div>
      </div>

      <div class="app-periodo" title="Período contable de la demostración">
        <CalendarDays :size="16" aria-hidden="true" />
        <span>{{ app.periodo }}</span>
      </div>

      <div ref="refNotificaciones" class="app-notificaciones">
        <button
          type="button"
          class="app-icono-boton"
          :aria-expanded="notificacionesAbiertas"
          aria-controls="panel-notificaciones"
          :aria-label="`Notificaciones: ${totalPendientes} documentos pendientes`"
          @click="alternarNotificaciones"
        >
          <Bell :size="19" aria-hidden="true" />
          <span v-if="totalPendientes > 0" class="app-icono-boton__punto" aria-hidden="true">
            {{ totalPendientes > 9 ? '9+' : totalPendientes }}
          </span>
        </button>

        <div
          v-if="notificacionesAbiertas"
          id="panel-notificaciones"
          class="app-popover"
          role="region"
          aria-label="Notificaciones"
        >
          <div class="app-popover__cabecera">
            <strong>Pendientes de registración</strong>
            <span>{{ totalPendientes }} documentos</span>
          </div>
          <div v-if="totalPendientes > 0" class="app-popover__lista">
            <RouterLink
              v-for="documento in contabilidad.documentosPendientes.slice(0, 5)"
              :key="documento.id"
              :to="{
                path: '/contaduria',
                query: { vista: 'bandeja', documento: documento.id },
              }"
              class="app-popover__item"
              @click="notificacionesAbiertas = false"
            >
              <span class="app-popover__icono" aria-hidden="true">
                <FileText :size="16" />
              </span>
              <span class="app-popover__item-texto">
                <strong>{{ etiquetasDocumento[documento.tipo] }} {{ documento.numero }}</strong>
                <small>
                  {{ documento.contraparte ?? documento.descripcion }} ·
                  {{ formatearMoneda(documento.importe) }}
                </small>
              </span>
            </RouterLink>
          </div>
          <p v-else class="app-popover__vacio">No hay documentos pendientes de registración.</p>
          <div class="app-popover__pie">
            <RouterLink
              :to="{ path: '/contaduria', query: { vista: 'bandeja' } }"
              class="app-popover__enlace"
              @click="notificacionesAbiertas = false"
            >
              Ver bandeja de Contaduría
            </RouterLink>
          </div>
        </div>
      </div>

      <div ref="refUsuario" class="app-usuario">
        <button
          type="button"
          class="app-usuario__boton"
          :aria-expanded="usuarioAbierto"
          aria-controls="menu-usuario"
          @click="alternarUsuario"
        >
          <span class="app-usuario__avatar" aria-hidden="true">{{ inicialesUsuario }}</span>
          <span class="app-usuario__datos">
            <strong>{{ app.usuario.nombre }}</strong>
            <small>{{ app.usuario.rol }}</small>
          </span>
          <ChevronDown :size="15" aria-hidden="true" class="texto-tenue" />
        </button>

        <div
          v-if="usuarioAbierto"
          id="menu-usuario"
          class="app-usuario__menu"
          role="region"
          aria-label="Menú de usuario"
        >
          <div class="app-usuario__resumen">
            <strong>{{ app.usuario.nombre }}</strong>
            <span>{{ app.usuario.rol }} · {{ app.nombreEmpresa }}</span>
            <span>Sesión de demostración</span>
          </div>
          <div class="app-usuario__opciones">
            <RouterLink
              to="/configuracion"
              class="app-usuario__opcion"
              @click="usuarioAbierto = false"
            >
              <Settings :size="16" aria-hidden="true" />
              Configuración
            </RouterLink>
            <RouterLink to="/ui-kit" class="app-usuario__opcion" @click="usuarioAbierto = false">
              <Palette :size="16" aria-hidden="true" />
              UI Kit de componentes
            </RouterLink>
            <span class="app-usuario__opcion" aria-hidden="true">
              <UserRound :size="16" />
              Perfil de demostración
            </span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
