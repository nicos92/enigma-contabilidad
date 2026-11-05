import type { Component } from 'vue'
import {
  BookOpenCheck,
  ChartColumn,
  LayoutDashboard,
  Library,
  Palette,
  ReceiptText,
  Route,
  Scale,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
} from '@lucide/vue'

export interface DestinoNavegacion {
  path: string
  query?: Record<string, string>
}

export interface HijoNavegacion {
  etiqueta: string
  descripcion?: string
  to: DestinoNavegacion
}

export interface ItemNavegacion {
  clave: string
  etiqueta: string
  descripcion: string
  icono: Component
  to: DestinoNavegacion
  hijos?: HijoNavegacion[]
}

export interface GrupoNavegacion {
  clave: string
  etiqueta: string
  items: ItemNavegacion[]
}

export interface DestinoBusqueda {
  etiqueta: string
  grupo: string
  descripcion: string
  icono: Component
  to: DestinoNavegacion
}

/**
 * Agrupación funcional del menú lateral. Los hijos usan el parámetro `vista`
 * para que cada módulo pueda abrir su pestaña o sección correspondiente sin
 * crear rutas duplicadas.
 */
export const GRUPOS_NAVEGACION: readonly GrupoNavegacion[] = [
  {
    clave: 'general',
    etiqueta: 'General',
    items: [
      {
        clave: 'panel',
        etiqueta: 'Panel general',
        descripcion: 'Indicadores, pendientes y accesos del período.',
        icono: LayoutDashboard,
        to: { path: '/dashboard' },
      },
      {
        clave: 'trazabilidad',
        etiqueta: 'Trazabilidad',
        descripcion: 'Recorrido guiado de compras y ventas hasta el balance.',
        icono: Route,
        to: { path: '/trazabilidad' },
      },
    ],
  },
  {
    clave: 'comercial',
    etiqueta: 'Comercial',
    items: [
      {
        clave: 'compras',
        etiqueta: 'Compras',
        descripcion: 'Facturas recibidas, estado de pago y documentación.',
        icono: ShoppingCart,
        to: { path: '/compras' },
      },
      {
        clave: 'ventas',
        etiqueta: 'Ventas',
        descripcion: 'Facturación emitida, cuentas por cobrar y cobranza.',
        icono: ReceiptText,
        to: { path: '/ventas' },
      },
      {
        clave: 'maestros',
        etiqueta: 'Maestros',
        descripcion: 'Proveedores, clientes y catálogo comercial.',
        icono: Users,
        to: { path: '/maestros' },
        hijos: [
          {
            etiqueta: 'Proveedores',
            descripcion: 'Cuenta corriente y datos fiscales.',
            to: { path: '/maestros', query: { vista: 'proveedores' } },
          },
          {
            etiqueta: 'Clientes',
            descripcion: 'Cuenta corriente y datos fiscales.',
            to: { path: '/maestros', query: { vista: 'clientes' } },
          },
          {
            etiqueta: 'Productos y servicios',
            descripcion: 'Precios, costos y alícuotas de IVA.',
            to: { path: '/maestros', query: { vista: 'productos' } },
          },
        ],
      },
    ],
  },
  {
    clave: 'finanzas',
    etiqueta: 'Finanzas y contabilidad',
    items: [
      {
        clave: 'tesoreria',
        etiqueta: 'Tesorería',
        descripcion: 'Pagos, cobros, fondos y transferencias.',
        icono: Wallet,
        to: { path: '/tesoreria' },
        hijos: [
          {
            etiqueta: 'Pagos',
            descripcion: 'Obligaciones con proveedores.',
            to: { path: '/tesoreria', query: { vista: 'pagos' } },
          },
          {
            etiqueta: 'Cobros',
            descripcion: 'Cuentas por cobrar de clientes.',
            to: { path: '/tesoreria', query: { vista: 'cobros' } },
          },
          {
            etiqueta: 'Movimientos de fondos',
            descripcion: 'Caja, bancos y transferencias.',
            to: { path: '/tesoreria', query: { vista: 'movimientos' } },
          },
        ],
      },
      {
        clave: 'contaduria',
        etiqueta: 'Contaduría',
        descripcion: 'Documentación, asientos y plan de cuentas.',
        icono: BookOpenCheck,
        to: { path: '/contaduria' },
        hijos: [
          {
            etiqueta: 'Bandeja de documentos',
            descripcion: 'Pendientes de revisión y registración.',
            to: { path: '/contaduria', query: { vista: 'bandeja' } },
          },
          {
            etiqueta: 'Asientos contables',
            descripcion: 'Asientos propuestos y registrados.',
            to: { path: '/contaduria', query: { vista: 'asientos' } },
          },
          {
            etiqueta: 'Plan de cuentas',
            descripcion: 'Estructura jerárquica del plan.',
            to: { path: '/contaduria', query: { vista: 'plan-cuentas' } },
          },
        ],
      },
      {
        clave: 'libros',
        etiqueta: 'Libros contables',
        descripcion: 'Diario y Mayor derivados de las registraciones.',
        icono: Library,
        to: { path: '/libros' },
        hijos: [
          {
            etiqueta: 'Libro Diario',
            descripcion: 'Asientos ordenados cronológicamente.',
            to: { path: '/libros', query: { vista: 'diario' } },
          },
          {
            etiqueta: 'Libro Mayor',
            descripcion: 'Movimientos y saldos por cuenta.',
            to: { path: '/libros', query: { vista: 'mayor' } },
          },
        ],
      },
      {
        clave: 'balances',
        etiqueta: 'Balances y estados',
        descripcion: 'Comprobación de sumas y saldos, y estados contables.',
        icono: Scale,
        to: { path: '/balances' },
        hijos: [
          {
            etiqueta: 'Balance de comprobación',
            descripcion: 'Sumas, saldos y verificación de igualdad.',
            to: { path: '/balances', query: { vista: 'comprobacion' } },
          },
          {
            etiqueta: 'Situación patrimonial',
            descripcion: 'Activo, pasivo y patrimonio neto.',
            to: { path: '/balances', query: { vista: 'situacion-patrimonial' } },
          },
          {
            etiqueta: 'Estado de resultados',
            descripcion: 'Ingresos, costos y resultado del ejercicio.',
            to: { path: '/balances', query: { vista: 'resultados' } },
          },
          {
            etiqueta: 'Flujo de efectivo',
            descripcion: 'Actividades operativas, de inversión y financiación.',
            to: { path: '/balances', query: { vista: 'flujo-efectivo' } },
          },
          {
            etiqueta: 'Evolución del patrimonio neto',
            descripcion: 'Capital, resultados acumulados y resultado del ejercicio.',
            to: { path: '/balances', query: { vista: 'evolucion-patrimonio' } },
          },
        ],
      },
    ],
  },
  {
    clave: 'analisis',
    etiqueta: 'Análisis',
    items: [
      {
        clave: 'informes',
        etiqueta: 'Informes',
        descripcion: 'Reportes del período y exportación de datos.',
        icono: ChartColumn,
        to: { path: '/informes' },
        hijos: [
          {
            etiqueta: 'Ventas por cliente',
            descripcion: 'Facturación, cobros y saldo por cliente.',
            to: { path: '/informes', query: { vista: 'ventas-clientes' } },
          },
          {
            etiqueta: 'Compras por proveedor',
            descripcion: 'Facturación, pagos y saldo por proveedor.',
            to: { path: '/informes', query: { vista: 'compras-proveedores' } },
          },
          {
            etiqueta: 'IVA del período',
            descripcion: 'Débito, crédito y posición fiscal.',
            to: { path: '/informes', query: { vista: 'iva' } },
          },
          {
            etiqueta: 'Top de productos',
            descripcion: 'Ranking por ventas netas registradas.',
            to: { path: '/informes', query: { vista: 'top-productos' } },
          },
        ],
      },
    ],
  },
  {
    clave: 'sistema',
    etiqueta: 'Sistema',
    items: [
      {
        clave: 'configuracion',
        etiqueta: 'Configuración',
        descripcion: 'Datos de la empresa, logo y datos de demostración.',
        icono: Settings,
        to: { path: '/configuracion' },
      },
      {
        clave: 'ui-kit',
        etiqueta: 'UI Kit',
        descripcion: 'Catálogo visual de componentes y estados.',
        icono: Palette,
        to: { path: '/ui-kit' },
      },
    ],
  },
]

export function itemDeRuta(path: string): ItemNavegacion | undefined {
  return GRUPOS_NAVEGACION.flatMap((grupo) => grupo.items).find((item) => item.to.path === path)
}

export function grupoDeRuta(path: string): GrupoNavegacion | undefined {
  return GRUPOS_NAVEGACION.find((grupo) => grupo.items.some((item) => item.to.path === path))
}

export function hijoActivo(
  item: ItemNavegacion,
  path: string,
  vista: unknown,
): HijoNavegacion | undefined {
  if (!item.hijos || typeof vista !== 'string') return undefined
  return item.hijos.find((hijo) => hijo.to.path === path && hijo.to.query?.vista === vista)
}

export function migasDeRuta(
  path: string,
  vista: unknown,
): Array<{ etiqueta: string; to?: DestinoNavegacion }> {
  const grupo = grupoDeRuta(path)
  const item = itemDeRuta(path)
  if (!item) return []

  const migas: Array<{ etiqueta: string; to?: DestinoNavegacion }> = []
  if (grupo) migas.push({ etiqueta: grupo.etiqueta })
  migas.push({ etiqueta: item.etiqueta, to: item.to })

  const activo = hijoActivo(item, path, vista)
  if (activo) migas.push({ etiqueta: activo.etiqueta })

  return migas
}

export const DESTINOS_BUSQUEDA: readonly DestinoBusqueda[] = GRUPOS_NAVEGACION.flatMap((grupo) =>
  grupo.items.flatMap((item) => {
    const destinos: DestinoBusqueda[] = [
      {
        etiqueta: item.etiqueta,
        grupo: grupo.etiqueta,
        descripcion: item.descripcion,
        icono: item.icono,
        to: item.to,
      },
    ]

    for (const hijo of item.hijos ?? []) {
      destinos.push({
        etiqueta: hijo.etiqueta,
        grupo: item.etiqueta,
        descripcion: hijo.descripcion ?? item.descripcion,
        icono: item.icono,
        to: hijo.to,
      })
    }

    return destinos
  }),
)
