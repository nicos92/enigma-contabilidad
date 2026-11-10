<script setup lang="ts">
import { ChevronRight, X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { GRUPOS_NAVEGACION, hijoActivo, type ItemNavegacion } from '@/config/navegacion'
import { useAppStore } from '@/stores/app'
import { useContabilidadStore } from '@/stores/contabilidad'
import { useUiStore } from '@/stores/ui'

const app = useAppStore()
const contabilidad = useContabilidadStore()
const ui = useUiStore()
const route = useRoute()

const abiertos = ref<Record<string, boolean>>({})

const logoSrc = computed(() => contabilidad.estado.empresa.logoDataUrl)

function itemActivo(item: ItemNavegacion): boolean {
  return route.path === item.to.path
}

function submenuAbierto(item: ItemNavegacion): boolean {
  return abiertos.value[item.clave] === true
}

function alternarSubmenu(item: ItemNavegacion): void {
  abiertos.value[item.clave] = !submenuAbierto(item)
}

function hijoEstaActivo(hijo: { to: { path: string; query?: Record<string, string> } }): boolean {
  return (
    route.path === hijo.to.path &&
    (hijo.to.query?.vista ?? undefined) === (route.query.vista ?? undefined)
  )
}

function sincronizarMenu(): void {
  for (const grupo of GRUPOS_NAVEGACION) {
    for (const item of grupo.items) {
      if (item.hijos && hijoActivo(item, route.path, route.query.vista)) {
        abiertos.value[item.clave] = true
      }
    }
  }
  ui.cerrarMenuMovil()
}

watch(() => route.fullPath, sincronizarMenu, { immediate: true })
</script>

<template>
  <aside class="app-sidebar" aria-label="Navegación lateral">
    <div class="app-sidebar__marca">
      <RouterLink to="/dashboard" class="app-brand">
        <span class="sr-only">Ir al panel general</span>
        <span class="app-brand__mark" aria-hidden="true">
          <img v-if="logoSrc" :src="logoSrc" alt="" />
          <template v-else>EG</template>
        </span>
        <span class="app-brand__text">
          <strong>{{ app.nombreProducto }}</strong>
          <small>{{ app.nombreEmpresa }}</small>
        </span>
      </RouterLink>
      <button
        type="button"
        class="app-sidebar__colapsar"
        :aria-label="ui.sidebarColapsada ? 'Expandir menú' : 'Colapsar menú'"
        @click="ui.alternarSidebar"
      >
        <ChevronRight :size="17" aria-hidden="true" style="transform: rotate(180deg)" />
      </button>
      <button
        type="button"
        class="app-sidebar__movil-cerrar"
        aria-label="Cerrar menú"
        @click="ui.cerrarMenuMovil"
      >
        <X :size="19" aria-hidden="true" />
      </button>
    </div>

    <div class="app-sidebar__scroll">
      <nav class="app-nav" aria-label="Módulos del sistema">
        <div v-for="grupo in GRUPOS_NAVEGACION" :key="grupo.clave" class="app-nav__grupo">
          <p class="app-nav__grupo-titulo">{{ grupo.etiqueta }}</p>

          <div v-for="item in grupo.items" :key="item.clave" class="app-nav__item">
            <div class="app-nav__fila">
              <RouterLink
                :to="item.to"
                class="app-nav__link"
                :class="{ 'app-nav__link--activo': itemActivo(item) }"
                :title="ui.sidebarColapsada ? item.etiqueta : undefined"
              >
                <component :is="item.icono" :size="18" aria-hidden="true" />
                <span>{{ item.etiqueta }}</span>
              </RouterLink>

              <button
                v-if="item.hijos"
                type="button"
                class="app-nav__toggle"
                :class="{ 'app-nav__toggle--abierto': submenuAbierto(item) }"
                :aria-expanded="submenuAbierto(item)"
                :aria-label="`${submenuAbierto(item) ? 'Contraer' : 'Expandir'} ${item.etiqueta}`"
                @click="alternarSubmenu(item)"
              >
                <ChevronRight :size="14" aria-hidden="true" />
              </button>
            </div>

            <div v-if="item.hijos && submenuAbierto(item)" class="app-nav__submenu">
              <RouterLink
                v-for="hijo in item.hijos"
                :key="hijo.etiqueta"
                :to="hijo.to"
                class="app-nav__sublink"
                :class="{ 'app-nav__sublink--activo': hijoEstaActivo(hijo) }"
              >
                {{ hijo.etiqueta }}
              </RouterLink>
            </div>
          </div>
        </div>
      </nav>
    </div>

    <div class="app-sidebar__pie">
      <strong>Datos de demostración</strong>
      <span>{{ app.periodo }} · Enigma Gestión</span>
    </div>
  </aside>
</template>
