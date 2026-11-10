# Enigma Gestión

Prototipo visual e interactivo de sistema de gestión contable para **Enigma Solutions**.
Cliente ficticio de la demo: **Comercializadora del Sur S.R.L.** · Período: **noviembre de 2026**.

Aplicación de demostración sin backend: los datos se almacenan en el navegador y se pueden
restaurar desde Configuración.

## Requisitos

- Node.js `^20.19.0 || >=22.12.0` (verificado con 26.13.0 LTS)
- pnpm 12 (`packageManager` fijado en `pnpm@12.16.1`)

## Puesta en marcha

```bash
cd enigma-contabilidad
pnpm install
pnpm dev
```

La aplicación se sirve en `http://localhost:5173` y usa **navegación por hash**
(`http://localhost:5173/#/dashboard`), por lo que no requiere configuración del servidor
para las rutas internas.

## Build de producción

```bash
pnpm build
pnpm preview
```

`pnpm build` verifica los tipos y genera `dist/`. `pnpm preview` sirve ese build en
`http://localhost:4173`. Es el flujo recomendado para presentar la aplicación.

## Build autónomo opcional

Para abrir la demo con doble clic, sin servidor:

```bash
pnpm build:single
```

Genera un único archivo `dist-single/index.html` con JavaScript, CSS, fuentes y favicon
incrustados. Se puede abrir directamente con `file://` en un navegador moderno. Este build es
opcional y no reemplaza al flujo normal con Vite.

## Scripts

| Script              | Descripción                                            |
| ------------------- | ------------------------------------------------------ |
| `pnpm dev`          | Servidor de desarrollo con recarga en caliente         |
| `pnpm build`        | Verificación de tipos y build de producción en `dist/` |
| `pnpm build:single` | Build autónomo de un solo archivo en `dist-single/`    |
| `pnpm preview`      | Sirve localmente el build de producción                |
| `pnpm test`         | Ejecuta la suite de Vitest una vez                     |
| `pnpm test:watch`   | Vitest en modo interactivo                             |
| `pnpm typecheck`    | Verificación de tipos con `vue-tsc`                    |
| `pnpm lint`         | ESLint sobre el proyecto                               |
| `pnpm lint:fix`     | ESLint con corrección automática                       |
| `pnpm format`       | Formatea con Prettier                                  |
| `pnpm format:check` | Verifica el formato sin modificar archivos             |

## Navegación y rutas

| Ruta             | Pantalla                                                    |
| ---------------- | ----------------------------------------------------------- |
| `/dashboard`     | Panel general con indicadores, gráficos y pendientes        |
| `/trazabilidad`  | Seguimiento de una compra o venta y recorrido guiado        |
| `/compras`       | Comprobantes recibidos, cuentas por pagar y alta de compras |
| `/ventas`        | Facturas emitidas, cuentas por cobrar y alta de ventas      |
| `/tesoreria`     | Pagos, cobros, movimientos de fondos y transferencias       |
| `/contaduria`    | Bandeja de documentos, asientos contables y plan de cuentas |
| `/libros`        | Libro Diario y Libro Mayor                                  |
| `/balances`      | Comprobación, situación patrimonial, resultados, flujo y PN |
| `/maestros`      | Proveedores, clientes y productos/servicios                 |
| `/informes`      | Reportes por período con exportación CSV                    |
| `/configuracion` | Empresa, usuario, logo, almacenamiento y reset demo         |
| `/ui-kit`        | Catálogo interno de componentes y estados                   |

La barra lateral, el menú de usuario y las pestañas conservan la ruta activa. Los módulos
admiten enlaces profundos, por ejemplo:

- `/compras?operacion=C-001&tab=factura`
- `/contaduria?vista=bandeja&documento=doc-compra-C-001`
- `/libros?vista=diario`
- `/balances?vista=comprobacion`
- `/tesoreria?vista=pagos&pago=P-001`

En `/trazabilidad` se puede iniciar el **recorrido guiado de 13 pasos**: navega solo por las
pantallas del circuito, muestra el progreso y permite avanzar con los botones o con las teclas
`←` y `→`. `Escape` cierra el recorrido.

## Flujo contable de aceptación

El circuito completo se puede hacer en este orden:

1. **Dashboard:** ingresar al panel general.
2. **Compras:** registrar una compra con proveedor, ítems e IVA.
3. **Compras:** abrir la factura recibida y su asiento propuesto.
4. **Tesorería → Pagos:** registrar el pago al proveedor.
5. **Contaduría:** ingresar a la bandeja de documentos.
6. **Contaduría:** revisar la documentación y el asiento propuesto.
7. **Contaduría:** aprobar y generar el asiento contable.
8. **Libros → Diario:** consultar el asiento registrado.
9. **Libros → Mayor:** seleccionar una cuenta y ver sus movimientos y saldo.
10. **Balances → Comprobación:** verificar que Debe = Haber y la ecuación patrimonial.
11. **Ventas:** registrar una venta y emitir la factura.
12. **Tesorería → Cobros:** registrar el cobro al cliente.
13. **Balances:** comprobar que la venta y el cobro actualizaron la contabilidad.

Los importes internos se guardan en centavos y se muestran en pesos argentinos
(`$ 1.250.000,00`). Las fechas se muestran como `DD/MM/AAAA`.

## Persistencia, reset y logo

- El estado se guarda en `localStorage` con una clave versionada.
- **Configuración → Restaurar demo** devuelve la empresa, el usuario, el logo, los maestros,
  las operaciones y los asientos al estado inicial. La acción pide confirmación.
- El logo se carga en **Configuración** en formato PNG, JPG o WebP, con un máximo de 1 MB.
  Se previsualiza, se usa en la barra lateral y en los comprobantes, y persiste al recargar.
- Si no hay logo cargado se muestra el espacio provisorio con las iniciales **EG**; no se
  inventa una marca.
- El botón **Quitar logo** vuelve al espacio provisorio y también pide confirmación.

## Informes y CSV

`/informes` reúne ventas por cliente, compras por proveedor, IVA por alícuota y top de
productos, con filtro de fechas. La exportación CSV incluye BOM UTF-8, escapes correctos,
importes en pesos y totales, por lo que abre bien en Excel y en planillas de cálculo.

## Calidad y accesibilidad

- Diseño responsive verificado en 1440, 1024 y 768 px.
- Navegación por teclado, enlace **Saltar al contenido**, foco visible y modales que atrapan
  el foco y se cierran con `Escape`.
- Etiquetas asociadas a los campos, nombres accesibles en botones y contraste revisado con
  axe (WCAG A/AA).
- 152 tests unitarios, `typecheck`, `lint` y `format:check` sin errores.
- Recorrido de aceptación completo sin errores de consola ni diferencias entre Debe y Haber.

## Estructura

```text
src/
  App.vue          Shell de la aplicación
  main.ts          Punto de entrada: Pinia, router y estilos
  css/             Tokens, estilos base y componentes
  router/          Rutas con createWebHashHistory
  stores/          Estado global con Pinia
  types/           Tipos compartidos
  data/            Datos de demostración
  core/            Motor contable, persistencia y recorrido guiado
  components/      Componentes reutilizables y de dominio
  views/           Pantallas de la aplicación
scripts/
  build-single.mjs Generador del build autónomo opcional
```

## Entrega final

La carpeta `../entrega/` reúne el README de entrega, el build de producción y el archivo
autónomo listo para presentar. El código fuente completo permanece en `enigma-contabilidad/`.

## Estado del proyecto

Fases F0 a F14 completadas: dominio contable, dashboard, compras, ventas, maestros, tesorería,
contaduría, libros, balances, trazabilidad con recorrido guiado, informes, configuración, QA y
entrega. El detalle de cada fase está en
[`../planes/PLAN-DESARROLLO.md`](../planes/PLAN-DESARROLLO.md).
