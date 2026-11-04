import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHashHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    titulo: string
    descripcion?: string
  }
}

const modulos = [
  {
    path: 'compras',
    name: 'compras',
    titulo: 'Compras',
    descripcion: 'Circuito de compras, facturas recibidas y estado de pago.',
  },
  {
    path: 'ventas',
    name: 'ventas',
    titulo: 'Ventas',
    descripcion: 'Facturación, cuenta por cobrar y cobranza.',
  },
  {
    path: 'tesoreria',
    name: 'tesoreria',
    titulo: 'Tesorería',
    descripcion: 'Pagos, cobros, movimientos de fondos y transferencias.',
  },
  {
    path: 'contaduria',
    name: 'contaduria',
    titulo: 'Contaduría',
    descripcion: 'Bandeja de documentos, asientos y plan de cuentas.',
  },
  {
    path: 'libros',
    name: 'libros',
    titulo: 'Libros contables',
    descripcion: 'Libro Diario y Libro Mayor derivados de las registraciones.',
  },
  {
    path: 'balances',
    name: 'balances',
    titulo: 'Balances y estados',
    descripcion: 'Balance de comprobación y estados contables.',
  },
  {
    path: 'maestros',
    name: 'maestros',
    titulo: 'Maestros',
    descripcion: 'Proveedores, clientes y catálogo de productos y servicios.',
  },
  {
    path: 'informes',
    name: 'informes',
    titulo: 'Informes',
    descripcion: 'Reportes del período y exportación de datos.',
  },
  {
    path: 'configuracion',
    name: 'configuracion',
    titulo: 'Configuración',
    descripcion: 'Datos de la empresa, logo y restauración de la demo.',
  },
] as const

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'dashboard' },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { titulo: 'Panel general' },
  },
  ...modulos.map<RouteRecordRaw>((modulo) => ({
    path: `/${modulo.path}`,
    name: modulo.name,
    component: () => import('@/views/PlaceholderView.vue'),
    props: {
      titulo: modulo.titulo,
      descripcion: modulo.descripcion,
    },
    meta: { titulo: modulo.titulo, descripcion: modulo.descripcion },
  })),
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { titulo: 'Página no encontrada' },
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
