# Enigma Gestión

Prototipo visual e interactivo de sistema de gestión contable para **Enigma Solutions**.
Cliente ficticio de la demo: **Comercializadora del Sur S.R.L.** · Período: **noviembre de 2026**.

Aplicación de demostración sin backend: los datos se almacenan en el navegador.

## Requisitos

- Node.js `^20.19.0 || >=22.12.0` (verificado con 26.13.0 LTS)
- pnpm 12 (`packageManager` fijado en `pnpm@12.16.1`)

## Puesta en marcha

```bash
pnpm install
pnpm dev
```

La aplicación se sirve en `http://localhost:5173` y usa **navegación por hash**
(`http://localhost:5173/#/dashboard`), por lo que no requiere configuración del servidor
para las rutas internas.

## Scripts

| Script              | Descripción                                            |
| ------------------- | ------------------------------------------------------ |
| `pnpm dev`          | Servidor de desarrollo con recarga en caliente         |
| `pnpm build`        | Verificación de tipos y build de producción en `dist/` |
| `pnpm preview`      | Sirve localmente el build de producción                |
| `pnpm test`         | Ejecuta la suite de Vitest una vez                     |
| `pnpm test:watch`   | Vitest en modo interactivo                             |
| `pnpm typecheck`    | Verificación de tipos con `vue-tsc`                    |
| `pnpm lint`         | ESLint sobre el proyecto                               |
| `pnpm lint:fix`     | ESLint con corrección automática                       |
| `pnpm format`       | Formatea con Prettier                                  |
| `pnpm format:check` | Verifica el formato sin modificar archivos             |

## Estructura

```text
src/
  App.vue          Layout provisional del prototipo
  main.ts          Punto de entrada: Pinia, router y estilos
  css/             Estilos base y tokens provisionales
  router/          Rutas con createWebHashHistory
  stores/          Estado global con Pinia
  types/           Tipos compartidos
  data/            Datos de demostración (F2)
  core/            Motor contable y persistencia (F2)
  components/      Componentes reutilizables (F3)
  views/           Pantallas de la aplicación
```

## Rutas disponibles

`/dashboard`, `/trazabilidad`, `/compras`, `/ventas`, `/tesoreria`, `/contaduria`, `/libros`,
`/balances`, `/maestros`, `/informes` y `/configuracion`.

La pantalla `/trazabilidad` permite seguir una compra o una venta desde su origen hasta el
balance, abrir la pantalla de cada etapa y presentar el recorrido guiado de 13 pasos.
`/informes` y `/configuracion` corresponden a la fase F13 y muestran su estado provisional.

## Estado del proyecto

Fases F0 a F12 completadas: dominio contable, dashboard, compras, ventas, maestros, tesorería,
contaduría, libros, balances y trazabilidad con recorrido guiado. El detalle de las fases
siguientes está en [`../planes/PLAN-DESARROLLO.md`](../planes/PLAN-DESARROLLO.md).
