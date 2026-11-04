<script setup lang="ts">
import {
  BookOpenCheck,
  ChartColumn,
  LayoutDashboard,
  Library,
  ReceiptText,
  Scale,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
} from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const route = useRoute()

const navegacion = [
  { to: '/dashboard', etiqueta: 'Panel general', icono: LayoutDashboard },
  { to: '/compras', etiqueta: 'Compras', icono: ShoppingCart },
  { to: '/ventas', etiqueta: 'Ventas', icono: ReceiptText },
  { to: '/tesoreria', etiqueta: 'Tesorería', icono: Wallet },
  { to: '/contaduria', etiqueta: 'Contaduría', icono: BookOpenCheck },
  { to: '/libros', etiqueta: 'Libros contables', icono: Library },
  { to: '/balances', etiqueta: 'Balances y estados', icono: Scale },
  { to: '/maestros', etiqueta: 'Maestros', icono: Users },
  { to: '/informes', etiqueta: 'Informes', icono: ChartColumn },
  { to: '/configuracion', etiqueta: 'Configuración', icono: Settings },
]

const tituloPagina = computed(() => route.meta.titulo ?? app.nombreProducto)
</script>

<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-brand">
        <span class="app-brand__mark" aria-hidden="true">EG</span>
        <span class="app-brand__text">
          <strong>{{ app.nombreProducto }}</strong>
          <small>{{ app.nombreEmpresa }}</small>
        </span>
      </div>

      <nav class="app-nav" aria-label="Navegación principal">
        <RouterLink
          v-for="item in navegacion"
          :key="item.to"
          :to="item.to"
          class="app-nav__link"
          active-class="app-nav__link--activo"
        >
          <component :is="item.icono" :size="18" aria-hidden="true" />
          <span>{{ item.etiqueta }}</span>
        </RouterLink>
      </nav>

      <p class="app-sidebar__footer">Prototipo académico · {{ app.periodo }}</p>
    </aside>

    <div class="app-body">
      <header class="app-topbar">
        <div>
          <p class="app-topbar__eyebrow">{{ app.nombreEmpresa }}</p>
          <h1 class="app-topbar__title">{{ tituloPagina }}</h1>
        </div>
        <span class="app-badge">Datos de demostración</span>
      </header>

      <main class="app-main">
        <RouterView />
      </main>
    </div>
  </div>
</template>
