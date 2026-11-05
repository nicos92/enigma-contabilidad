# Plan de desarrollo — Enigma Gestión

> Prototipo visual e interactivo de sistema de gestión contable para **Enigma Solutions**.
> Documento de seguimiento del desarrollo, fase por fase.

**Proyecto:** Enigma Gestión — mini ERP de demostración
**Cliente ficticio de la demo:** Comercializadora del Sur S.R.L.
**Período de los datos:** noviembre de 2026
**Última actualización:** 05/11/2026
**Estado general:** Fase 13 completada — informes y configuración
**Fases completadas:** 14 / 15
**Próxima fase:** F14 — QA y entrega

---

## 1. Objetivo del proyecto

Construir una aplicación web de demostración que permita mostrar, frente a un cliente, cómo una operación comercial recorre todos los departamentos de una organización y termina transformada en información contable:

```text
COMPRAS / VENTAS
       ↓
DOCUMENTACIÓN COMERCIAL
       ↓
TESORERÍA
       ↓
CONTADURÍA
       ↓
LIBRO DIARIO
       ↓
LIBRO MAYOR
       ↓
BALANCE DE COMPROBACIÓN
       ↓
ESTADOS CONTABLES
```

La aplicación debe parecer un producto comercial, no un trabajo escolar: datos coherentes desde el primer inicio, formularios validados, documentos simulados, navegación fluida y estados contables que cierren.

---

## 2. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Framework | Vue 3 + TypeScript |
| Build | Vite 8+ con servidor local (`pnpm dev` / `pnpm preview`) |
| Estado global | Pinia |
| Navegación | Vue Router en modo hash, sin recargas |
| Estilos | CSS3 propio con variables de diseño; sin Tailwind |
| Gráficos | Chart.js + vue-chartjs |
| Iconos | Lucide |
| Persistencia | `localStorage` versionado + opción de restaurar datos demo |
| Backend | Ninguno |
| Moneda | Peso argentino (ARS), importes internos en centavos |
| Fechas | `DD/MM/AAAA` en pantalla; `YYYY-MM-DD` interno |
| Marca | Producto **Enigma Gestión**, empresa **Enigma Solutions** |
| Logo | Imagen del DOCX como provisoria; espacio para logo definitivo |
| Contabilidad | Completa: inventario, costo de ventas, IVA, amortización y asiento de apertura |
| Estados | Situación Patrimonial, Resultados, Flujo de Efectivo y Evolución del PN |
| Build autónomo | Script opcional `build:single`; no es el flujo principal |

### 2.1. Nota sobre la ejecución

La entrega principal se ejecuta con Vite:

```bash
pnpm install
pnpm dev
```

Para una versión de presentación:

```bash
pnpm build
pnpm preview
```

El script opcional `build:single` generará un `dist/index.html` autónomo para el caso de que la consigna exija abrir el archivo con doble clic. No reemplaza el flujo normal de desarrollo.

---

## 3. Entorno técnico

| Herramienta | Versión objetivo | Versión instalada | Estado |
|---|---:|---:|---|
| Node.js | 26.13.0 LTS (Lithium) | 26.13.0 | Instalado |
| npm | 11.x | 11.20.0 | Instalado |
| pnpm | 12.16.1 | 12.16.1 | Instalado |
| Vite | 8.3.5 | 8.3.5 | Verificado |
| Vue | 3.5.44 | 3.5.44 | Verificado |
| TypeScript | 6.0.3 | 6.0.3 | Verificado |
| @vitejs/plugin-vue | 6.0.10 | 6.0.10 | Verificado |
| vue-tsc | 3.3.14 | 3.3.14 | Verificado |

> TypeScript 7.0.2 es la última versión publicada, pero el scaffold oficial de Vite 8 utiliza TypeScript 6.0.3 para mantener compatibilidad con `vue-tsc 3.3.14`. Se prioriza una combinación estable y verificada.

**Requisito de Vite 8:** Node `^20.19.0 || >=22.12.0`. Node 26.13.0 LTS cumple ampliamente.

**Smoke test realizado:** proyecto temporal `/tmp/opencode/vite-smoke` con Vite 8.3.5, Vue 3.5.44, TypeScript 6.0.3 y `@vitejs/plugin-vue` 6.0.10. `pnpm build` finalizó correctamente con Node 26.13.0 y pnpm 12.16.1.

> En terminales nuevas, `.zshrc` activa automáticamente la versión default de nvm (26.13.0). Si una terminal ya estaba abierta antes de la actualización, ejecutar `nvm use 26.13.0` para adoptar la nueva versión.

### 3.1. Criterio de actualización del entorno

- Instalar Node 26.13.0 LTS con `nvm`.
- Dejar Node 22 instalado como respaldo.
- Instalar pnpm 12.16.1 globalmente bajo Node 26.
- Verificar `node -v`, `pnpm -v` y un smoke test de Vite 8 + Vue 3 + TypeScript.
- Si alguna dependencia no es compatible con Node 26, volver a Node 24.22.2 LTS (Krypton) y registrar la decisión.

---

## 4. Leyenda de estados

| Estado | Significado |
|---|---|
| `Pendiente` | No iniciada |
| `En curso` | Se está trabajando en ella |
| `Completado` | Cumple su criterio de aceptación y está verificada |
| `Bloqueada` | Depende de una decisión o de otra fase |
| `Diferida` | Fuera del alcance de esta entrega |

En las tareas:

- `[ ]` pendiente
- `[x]` completada
- `[~]` en curso

---

## 5. Resumen de fases

| Fase | Nombre | Entregable principal | Estado | Avance |
|---|---|---|---|---:|
| F0 | Entorno y preparación | Node, pnpm y compatibilidad con Vite 8 | Completado | 100% |
| F1 | Scaffold del proyecto | Proyecto Vue 3 + TS + Vite funcionando | Completado | 100% |
| F2 | Dominio, datos y motor contable | Tipos, seed, asientos y persistencia | Completado | 100% |
| F3 | Sistema visual y layout | Design system, sidebar, topbar y UI kit | Completado | 100% |
| F4 | Dashboard | Panel general con indicadores y gráficos | Completado | 100% |
| F5 | Compras | Listado, formulario, factura y estados | Completado | 100% |
| F6 | Ventas | Listado, formulario, factura y cobranza | Completado | 100% |
| F7 | Maestros | Proveedores, clientes y productos | Completado | 100% |
| F8 | Tesorería | Pagos, cobros, movimientos y transferencias | Completado | 100% |
| F9 | Contaduría | Bandeja, asientos y plan de cuentas | Completado | 100% |
| F10 | Libros contables | Libro Diario y Libro Mayor | Completado | 100% |
| F11 | Balances y estados | Comprobación, ESP, ER, flujo y evolución | Completado | 100% |
| F12 | Trazabilidad | Stepper integrado y recorrido guiado | Completado | 100% |
| F13 | Informes y configuración | Reportes, CSV, logo y reset | Completado | 100% |
| F14 | QA y entrega | Tests, build, README y aceptación | Pendiente | 0% |

---

## 6. Detalle fase por fase

### F0 — Entorno y preparación

**Estado:** Completado
**Depende de:** nada
**Objetivo:** dejar el entorno listo para desarrollar con Vite 8, Vue 3 y TypeScript.

**Tareas**

- [x] Relevar `primer_prompt.md`, `requerimientos.md` y el borrador del TP.
- [x] Cerrar decisiones de arquitectura, marca y alcance contable.
- [x] Verificar los requisitos de Vite 8 (`^20.19.0 || >=22.12.0`).
- [x] Verificar versiones actuales de Node, pnpm y dependencias.
- [x] Instalar Node 26.13.0 LTS con `nvm`.
- [x] Instalar pnpm 12.16.1.
- [x] Ejecutar smoke test de Vite 8 + Vue 3 + TypeScript.
- [x] Registrar versiones finales en este documento.

**Entregable:** entorno actualizado y comprobado.

**Evidencia**

- `node -v` → `v26.13.0`
- `pnpm -v` → `12.16.1`
- `vite --version` → `vite/8.3.5 linux-x64 node-v26.13.0`
- `pnpm build` del proyecto temporal → OK
- Node 22 y Node 24 permanecen instalados como respaldo.

**Criterio de aceptación**

- `node -v` devuelve la versión LTS elegida.
- `pnpm -v` devuelve 12.16.1 o superior.
- Un proyecto temporal con Vite 8, Vue 3 y TypeScript compila sin errores.
- El plan queda actualizado con las versiones reales.

**Riesgos**

- Node 26 puede ser demasiado nuevo para alguna dependencia nativa. Mitigación: smoke test superado; fallback disponible a Node 24.22.2 LTS.
- El cambio de versión por defecto puede afectar otros proyectos. Mitigación: Node 22 y 24 siguen instalados y se puede cambiar con `nvm use`.

---

### F1 — Scaffold del proyecto

**Estado:** Completado
**Depende de:** F0
**Objetivo:** crear la base del proyecto `enigma-contabilidad/` y dejar el ciclo de desarrollo funcionando.

**Tareas**

- [x] Crear `enigma-contabilidad/` con Vite + Vue + TypeScript.
- [x] Configurar `pnpm` como gestor del proyecto.
- [x] Configurar `tsconfig` en modo estricto y alias `@/`.
- [x] Instalar Vue Router, Pinia, Chart.js, vue-chartjs, Lucide y la fuente Inter.
- [x] Instalar Vitest, Vue Test Utils y jsdom.
- [x] Configurar scripts: `dev`, `build`, `preview`, `test`, `typecheck`.
- [x] Configurar ESLint y Prettier.
- [x] Crear estructura `src/{router,stores,types,data,core,components,views,css}`.
- [x] Configurar el router con `createWebHashHistory`.
- [x] Configurar Pinia y el punto de entrada.
- [x] Crear `App.vue` mínimo con layout provisional.
- [x] Verificar `pnpm dev`, `pnpm build` y `pnpm test`.

**Entregable:** aplicación mínima que arranca, compila y testea.

**Evidencia**

- Proyecto creado en `enigma-contabilidad/` con Vite 8.3.5, Vue 3.5.44 y TypeScript 6.0.3.
- Dependencias exactas: `vue-router 5.4.0`, `pinia 4.1.0`, `chart.js 4.6.1`, `vue-chartjs 5.3.4`, `@lucide/vue 1.67.0` y `@fontsource/inter 5.3.0`.
- Tooling de calidad: `vitest 5.1.0`, `@vue/test-utils 2.5.1`, `jsdom 30.1.3`, `eslint 10.14.0` y `prettier 3.9.10`.
- `@lucide/vue` se usa en lugar de `lucide-vue-next`, que está deprecado por el propio paquete.
- `pnpm dev` responde en `http://localhost:5199/` (puerto de verificación) sin errores.
- `pnpm build` transforma 2066 módulos y genera `dist/` correctamente.
- `pnpm preview` sirve el build en `http://localhost:5198/` (puerto de verificación) con respuesta 200.
- `pnpm test` ejecuta 2 archivos y 3 pruebas de humo, todas aprobadas.
- `pnpm typecheck`, `pnpm lint` y `pnpm format:check` terminan sin errores.
- El router usa `createWebHashHistory`; una prueba verifica los hashes `#/dashboard` y `#/compras`.
- Estructura `src/{router,stores,types,data,core,components,views,css,test}` creada, con rutas provisionales para los módulos de las fases siguientes.

**Criterio de aceptación**

- `pnpm dev` levanta la app sin errores.
- `pnpm build` termina correctamente.
- `pnpm test` ejecuta al menos un test de humo.
- `pnpm typecheck` no reporta errores.
- La navegación por hash funciona.

---

### F2 — Dominio, datos y motor contable

**Estado:** Completado
**Depende de:** F1
**Objetivo:** construir el corazón del sistema: tipos, datos de demostración, generación de asientos y derivación de libros.

**Tareas**

- [x] Definir tipos: cuentas, proveedores, clientes, productos, compras, ventas, pagos, cobros, movimientos, documentos y asientos.
- [x] Crear el plan de cuentas jerárquico con los códigos del prompt y las cuentas ampliadas necesarias.
- [x] Definir catálogos: 5 proveedores, 5 clientes y 10 productos/servicios.
- [x] Crear asiento de apertura con capital, banco, caja, mercaderías y equipos.
- [x] Crear 8 compras y 8 ventas ficticias de noviembre de 2026.
- [x] Crear 5 pagos y 5 cobros, incluyendo un pago parcial y un cobro parcial.
- [x] Crear movimientos de tesorería y al menos una transferencia interna.
- [x] Crear asientos propuestos y registrados coherentes.
- [x] Implementar generación de asiento por compra, venta, pago, cobro, transferencia y amortización.
- [x] Implementar aprobación idempotente: un documento no puede registrarse dos veces.
- [x] Implementar derivación Diario → Mayor → Balance de comprobación.
- [x] Implementar derivación de Estado de Situación Patrimonial y Estado de Resultados.
- [x] Implementar persistencia en `localStorage` con clave versionada.
- [x] Implementar restauración de datos originales.
- [x] Escribir tests de balanceo, derivación, idempotencia y ecuación contable.
- [x] Verificar que todos los asientos cumplan Debe = Haber.

**Entregable:** motor contable probado y datos demo coherentes.

**Evidencia**

- Tipos de dominio en `src/types/contabilidad.ts`; helpers monetarios en `src/core/dinero.ts` (centavos enteros).
- Plan de cuentas jerárquico en `src/data/plan-cuentas.ts`, con cuentas de agrupación no imputables y códigos centralizados en `CODIGOS`.
- Catálogos en `src/data/catalogos.ts`: 5 proveedores, 5 clientes, 7 productos y 3 servicios; apertura, período y amortización mensual de equipos.
- Semilla en `src/data/demo.ts`: 8 compras, 8 ventas, 5 pagos, 5 cobros, 1 transferencia interna, apertura, amortización, liquidación de IVA y provisión de impuesto.
- 37 asientos generados: 35 registrados y 2 propuestos (`C-008` en revisión y `V-008` pendiente). Solo los registrados alimentan los libros.
- Pago parcial de `C-001` (350.000.000 de 617.100.000 centavos) y cobro parcial de `V-001` (150.000.000 de 302.500.000 centavos).
- Motor en `src/core/contabilidad/asientos.ts`: generadores por operación, validación de partida doble, numeración correlativa y rechazo de asientos inválidos.
- Derivaciones en `src/core/contabilidad/derivaciones.ts`: Diario → Mayor → Balance de comprobación → ER/ESP, además de tesorería, stock y saldos de terceros.
- Persistencia en `src/core/persistencia.ts` con clave `enigma-gestion:estado:v1`, validación de esquema, descarte de versiones incompatibles y restauración demo.
- Store Pinia en `src/stores/contabilidad.ts` con estado derivado y `aprobarDocumento` idempotente.
- Tests: 49 pruebas en 6 archivos, todas aprobadas (`pnpm test`).
- `pnpm typecheck`, `pnpm lint` y `pnpm format:check` terminan sin errores.
- Cifras verificadas del seed: capital inicial 2.004.500.000; IVA saldo a favor 105.630.000; resultado antes de impuestos 117.166.667; impuesto 29.291.667; resultado del ejercicio 87.875.000 centavos.
- Ecuación patrimonial verificada: Activo 2.981.431.667 = Pasivo 889.056.667 + Patrimonio Neto 2.092.375.000 centavos.
- El valor del stock final (1.476.500.000) coincide con el saldo de Mercaderías, y los saldos de proveedores/clientes concilian con sus cuentas de control.

**Criterio de aceptación**

- Todos los asientos del seed están balanceados.
- El Libro Mayor surge exclusivamente del Libro Diario.
- El Balance de Comprobación surge exclusivamente del Mayor.
- Activo = Pasivo + Patrimonio Neto.
- Aprobar dos veces el mismo documento no duplica el asiento.
- Los datos persisten entre recargas y se pueden restaurar.

**Riesgos**

- Diferencias de redondeo. Mitigación: importes en centavos enteros.
- Incoherencia entre datos comerciales y contables. Mitigación: derivar todo desde el mismo estado y cubrir con tests.

---

### F3 — Sistema visual y layout

**Estado:** Completado
**Depende de:** F1
**Objetivo:** definir la identidad visual y los componentes reutilizables.

**Tareas**

- [x] Crear tokens CSS: colores, tipografía, espaciado, radios, sombras y estados.
- [x] Crear `styles.css`, `layout.css` y `components.css`.
- [x] Implementar sidebar con grupos, submenús, estado activo y colapso.
- [x] Implementar topbar con breadcrumb, búsqueda, notificaciones, usuario y período.
- [x] Implementar layout responsive para escritorio y tablet.
- [x] Crear componentes UI: botón, input, select, textarea, checkbox, badge, card, tabla, modal, confirmación, toast, tabs, paginación, empty state, tooltip y currency input.
- [x] Crear visor de documentos y timeline de trazabilidad.
- [x] Implementar foco visible, navegación por teclado y cierre de modales con Escape.
- [x] Crear una ruta interna `/ui-kit` para revisar componentes.
- [x] Reservar el espacio del logo y permitir su carga desde configuración.

**Entregable:** shell visual completo y UI kit reutilizable.

**Evidencia**

- Tokens en `src/css/tokens.css`: paleta, tipografía Inter, espaciado, radios, sombras, transiciones y estados semánticos.
- Estilos globales y utilitarios en `src/css/styles.css`; shell responsive en `src/css/layout.css`; componentes y UI kit en `src/css/components.css`. `base.css` fue reemplazado.
- Shell en `src/App.vue` con skip link, overlay móvil, pila de notificaciones y contenido accesible.
- Sidebar en `src/components/layout/AppSidebar.vue`: grupos, submenús con `?vista=`, estado activo, colapso persistido en `localStorage` y drawer fuera de pantalla.
- Topbar en `src/components/layout/AppTopbar.vue`: breadcrumb, búsqueda de destinos, notificaciones derivadas de documentos pendientes, período y menú de usuario.
- Componentes reutilizables en `src/components/ui/`: botón, input, select, textarea, checkbox, badge, card, tabla, modal, confirmación, toast, tabs, paginación, empty state, tooltip y currency input.
- Visor documental en `DocumentViewer.vue` y timeline en `TraceTimeline.vue`, usados en el catálogo interno.
- Modales con foco inicial, trampa de foco, cierre con Escape, bloqueo de scroll y restauración del foco previo.
- Ruta `/ui-kit` en `src/router/index.ts` y catálogo vivo en `src/views/UIKitView.vue`, con demostración de estados normal, hover, foco, deshabilitado y error.
- Configuración en `src/views/ConfiguracionView.vue`: carga, vista previa y eliminación del logo, persistido en `estado.empresa.logoDataUrl`.
- Layout responsive con cortes en 1280, 1080, 960 y 640 px; por debajo de 960 px el sidebar pasa a drawer con overlay y el topbar reorganiza búsqueda y acciones.
- Tests nuevos para `CurrencyInput`, `AppModal`, store de UI y ruta `/ui-kit`: 65 pruebas en 9 archivos, todas aprobadas.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` y `pnpm build` terminan sin errores.

**Criterio de aceptación**

- La navegación lateral funciona sin recargar.
- El layout se adapta a 1440, 1024 y 768 px.
- Los componentes tienen estados normal, hover, focus, disabled y error.
- No hay estilos rotos ni scroll horizontal en escritorio.

---

### F4 — Dashboard

**Estado:** Completado
**Depende de:** F2, F3
**Objetivo:** construir la pantalla de inicio con visión general de la empresa.

**Tareas**

- [x] Crear tarjetas de ventas, compras, cuentas por cobrar, cuentas por pagar, saldo disponible y resultado.
- [x] Calcular todos los indicadores desde los datos, sin valores hardcodeados.
- [x] Crear gráfico de ingresos y egresos por semana de noviembre.
- [x] Crear listado de últimas operaciones.
- [x] Crear panel de documentos pendientes de aprobación.
- [x] Crear panel de operaciones pendientes de registración.
- [x] Crear accesos rápidos a compras, ventas, pagos y cobros.
- [x] Agregar acceso al recorrido guiado.
- [x] Verificar coherencia entre los KPI y los módulos.

**Entregable:** dashboard completo y navegable.

**Evidencia**

- `src/views/DashboardView.vue`: panel con seis KPI navegables, gráfico, últimas operaciones, pendientes, accesos rápidos y modal de recorrido guiado.
- `src/core/dashboard.ts`: derivación pura de indicadores, agrupación semanal de flujo de fondos, últimas operaciones y pendientes. No hay importes fijos.
- `src/components/dashboard/GraficoIngresosEgresos.vue`: gráfico de barras con Chart.js y tabla alternativa accesible cuando no hay contexto de canvas.
- `src/css/styles.css`: estilos del dashboard con grilla responsive de 6 → 3 → 2 → 1 columnas y adaptación del panel lateral.
- Indicadores del seed, en centavos: ventas `1.116.225.000`; compras `1.724.855.000`; cuentas por cobrar `355.175.000`; cuentas por pagar `613.765.000`; saldo disponible `647.460.000`; resultado del ejercicio `87.875.000`.
- El gráfico usa exclusivamente movimientos de caja y banco del período, sin apertura ni transferencias internas. Se agrupa en cinco semanas: ingresos `761.050.000` y egresos `1.113.590.000`.
- El listado muestra las ocho operaciones más recientes, ordenadas por fecha descendente, con enlace a su módulo de origen.
- Los dos documentos pendientes enlazan a `#/contaduria?vista=bandeja&documento=...`; los dos asientos propuestos enlazan a `#/contaduria?vista=asientos&asiento=...`.
- Accesos rápidos verificados: `#/compras?vista=nueva`, `#/ventas?vista=nueva`, `#/tesoreria?vista=pagos&accion=nuevo` y `#/tesoreria?vista=cobros&accion=nuevo`.
- El recorrido guiado abre un modal con cinco etapas enlazadas: compras/ventas, tesorería, contaduría, libros y balances.
- Tests nuevos en `src/core/dashboard.spec.ts` y `src/views/DashboardView.spec.ts`: 74 pruebas en 11 archivos, todas aprobadas.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` y `pnpm build` terminan sin errores.

**Criterio de aceptación**

- Los seis indicadores muestran importes coherentes.
- El gráfico se alimenta de operaciones reales del sistema.
- Los pendientes enlazan a la bandeja o al módulo correspondiente.
- Los accesos rápidos abren el formulario correcto.

---

### F5 — Compras

**Estado:** Completado
**Depende de:** F2, F3
**Objetivo:** administrar compras y generar la documentación recibida.

**Tareas**

- [x] Crear listado con búsqueda por proveedor y filtros por fecha y estado.
- [x] Crear formulario con proveedor, CUIT, fecha, tipo y número de comprobante, condición de pago, ítems, cantidad, precio, IVA, subtotal y total.
- [x] Implementar validaciones visuales y cálculo automático.
- [x] Implementar numeración automática de comprobantes.
- [x] Crear detalle de compra.
- [x] Crear factura recibida simulada e imprimible.
- [x] Actualizar estado de pago y estado contable.
- [x] Enviar la operación a la bandeja de Contaduría.
- [x] Persistir la operación y reflejarla en el dashboard.

**Entregable:** módulo de compras operativo.

**Evidencia**

- `src/views/ComprasView.vue`: listado con filtros, resumen, cuentas por pagar, formulario, detalle con pestañas, factura recibida y trazabilidad.
- `src/core/compras.ts`: filtros, resumen, numeración automática, vencimientos, validación, generación de compra, cuentas por pagar y etiquetas de estado.
- `src/stores/contabilidad.ts`: `registrarCompra` agrega la compra, el asiento propuesto y el documento pendiente, y persiste el estado.
- `src/router/index.ts`: `/compras` carga `ComprasView.vue`.
- `src/core/contabilidad/asientos.ts`: `generarAsientoCompra` omite la línea de IVA cuando es cero.
- `src/css/styles.css`: estilos específicos de compras e impresión de la factura recibida con `body.imprimiendo-factura`.
- Numeración automática: siguiente comprobante `FC-A-0001-00000109`; siguiente ID `C-009`.
- La factura recibida usa `DocumentViewer`, con leyenda de demostración, totales con IVA y redondeo al centavo.
- Las nuevas compras quedan pendientes en la bandeja de Contaduría y en el dashboard.
- Tests nuevos en `src/core/compras.spec.ts`, `src/stores/contabilidad.compras.spec.ts` y `src/views/ComprasView.spec.ts`.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` y `pnpm test` terminan sin errores.

**Criterio de aceptación**

- Se puede registrar una compra completa.
- La factura se genera con datos correctos y leyenda de demostración.
- La compra aparece en el listado, el dashboard y la bandeja.
- Los importes respetan IVA y redondeo.

---

### F6 — Ventas

**Estado:** Completado
**Depende de:** F2, F3
**Objetivo:** administrar ventas, facturación y estado de cobranza.

**Tareas**

- [x] Crear listado con búsqueda por cliente y filtros por fecha y estado.
- [x] Crear formulario con cliente, CUIT, fecha, tipo y número de comprobante, condición de venta, ítems, cantidad, precio, IVA, subtotal y total.
- [x] Implementar validaciones y cálculo automático.
- [x] Crear factura emitida simulada e imprimible.
- [x] Actualizar cuenta por cobrar y estado de cobranza.
- [x] Registrar costo de ventas y movimiento de mercaderías.
- [x] Enviar la operación a la bandeja de Contaduría.
- [x] Persistir y reflejar en dashboard e informes.

**Entregable:** módulo de ventas operativo.

**Criterio de aceptación**

- Se puede registrar una venta completa.
- La factura emitida se genera correctamente.
- El saldo del cliente y la cuenta por cobrar se actualizan.
- El asiento de venta y costo de venta está balanceado.

---

### F7 — Maestros

**Estado:** Completado
**Depende de:** F2, F3
**Objetivo:** consultar y administrar proveedores, clientes y productos.

**Tareas**

- [x] Crear listado y ficha de proveedores con saldo y historial.
- [x] Crear listado y ficha de clientes con saldo y historial.
- [x] Crear catálogo de productos/servicios con precio, costo y alícuota de IVA.
- [x] Implementar alta y edición con validaciones.
- [x] Vincular cada ficha con sus operaciones y asientos.
- [x] Impedir la eliminación de maestros con operaciones asociadas.

**Entregable:** maestros integrados con el resto del sistema.

**Criterio de aceptación**

- Los saldos de proveedores y clientes coinciden con sus operaciones.
- Se puede crear y editar un maestro.
- Los maestros usados no se pueden borrar sin advertencia.

---

### F8 — Tesorería

**Estado:** Completado
**Depende de:** F2, F3, F5, F6
**Objetivo:** registrar pagos, cobros, movimientos de fondos y transferencias.

**Tareas**

- [x] Crear pantalla de pagos con proveedor, factura, importe pendiente, vencimiento, medio y estado.
- [x] Implementar pago total y parcial con validaciones.
- [x] Generar comprobante de pago.
- [x] Actualizar saldo del proveedor.
- [x] Generar movimiento de tesorería y documento para Contaduría.
- [x] Crear pantalla de cobros con las mismas reglas.
- [x] Generar recibo ficticio.
- [x] Actualizar saldo del cliente.
- [x] Crear pantalla de movimientos de fondos con fecha, descripción, origen, destino, ingreso, egreso y saldo.
- [x] Implementar transferencias entre caja y banco.
- [x] Implementar filtros por cuenta y período.
- [x] Verificar que no se pueda pagar o cobrar más que el saldo pendiente.

**Entregable:** tesorería completa y vinculada a compras/ventas/contaduría.

**Criterio de aceptación**

- Un pago parcial actualiza el saldo y deja la factura en estado parcial.
- El comprobante y el movimiento se generan una sola vez.
- La transferencia impacta en ambas cuentas.
- Los saldos de tesorería son coherentes.

---

### F9 — Contaduría

**Estado:** Completado
**Depende de:** F2, F3, F5, F6, F8
**Objetivo:** revisar la documentación y aprobar la registración contable.

**Tareas**

- [x] Crear bandeja con fecha, documento, tipo, origen, cliente/proveedor, importe, estado y acción.
- [x] Implementar los estados: pendiente, en revisión, aprobado, registrado y observado.
- [x] Implementar filtros por origen, estado y fecha.
- [x] Crear detalle con documento simulado, información comercial, impuestos, cuenta sugerida y asiento propuesto.
- [x] Implementar aprobación y registración idempotente.
- [x] Implementar observación con motivo y reapertura.
- [x] Crear pantalla de asientos contables con filtros y detalle.
- [x] Crear árbol de plan de cuentas con código, nombre, tipo y naturaleza.
- [x] Vincular cada asiento con su documento de origen.
- [x] Actualizar libros y balances al registrar.

**Entregable:** circuito contable completo.

**Criterio de aceptación**

- Aprobar una operación genera un único asiento registrado.
- El asiento aparece en el Libro Diario y actualiza el Mayor.
- Observar una operación no genera asiento.
- El plan de cuentas muestra la jerarquía correctamente.

---

### F10 — Libros contables

**Estado:** Completado
**Depende de:** F9
**Objetivo:** consultar el Libro Diario y el Libro Mayor derivados de los asientos registrados.

**Tareas**

- [x] Crear Libro Diario con fecha, número, cuenta, descripción, Debe y Haber.
- [x] Implementar filtros por fecha, número de asiento y cuenta.
- [x] Mostrar totales y verificación Debe = Haber.
- [x] Permitir abrir el detalle del asiento.
- [x] Vincular cada asiento con su comprobante.
- [x] Crear Libro Mayor con selector de cuenta.
- [x] Mostrar saldo inicial, movimientos, total Debe, total Haber y saldo final.
- [x] Implementar filtros por período.
- [x] Permitir abrir el asiento original desde cada movimiento.
- [x] Verificar que el Mayor se derive del Diario.

**Entregable:** libros contables profesionales.

**Criterio de aceptación**

- El Diario muestra todos los asientos registrados y ninguno propuesto.
- Los totales coinciden.
- El Mayor de una cuenta coincide con sus movimientos del Diario.
- Los saldos respetan la naturaleza de cada cuenta.

---

### F11 — Balances y estados

**Estado:** Completado
**Depende de:** F10
**Objetivo:** generar el balance de comprobación y los estados contables.

**Tareas**

- [x] Crear Balance de Comprobación con código, cuenta, sumas Debe, sumas Haber, saldo deudor y saldo acreedor.
- [x] Mostrar totales generales y verificación de igualdad.
- [x] Permitir consultar el detalle de cada cuenta.
- [x] Crear Estado de Situación Patrimonial con activo corriente, no corriente, pasivo y patrimonio neto.
- [x] Verificar Activo = Pasivo + Patrimonio Neto.
- [x] Crear Estado de Resultados con ventas, costo, resultado bruto, gastos, resultado operativo, resultado antes de impuestos y resultado del ejercicio.
- [x] Crear Estado de Flujo de Efectivo.
- [x] Crear Estado de Evolución del Patrimonio Neto.
- [x] Agregar impresión de estados.
- [x] Verificar coherencia con los asientos registrados.

**Entregable:** balances y estados contables completos.

**Criterio de aceptación**

- El balance de comprobación cierra.
- La ecuación patrimonial se cumple.
- El resultado del ejercicio coincide con el Estado de Resultados.
- Los estados usan exclusivamente datos registrados.

---

### F12 — Trazabilidad y recorrido guiado

**Estado:** Completado
**Depende de:** F5 a F11
**Objetivo:** demostrar visualmente el recorrido completo de una operación.

**Tareas**

- [x] Crear selector de operación (compra o venta).
- [x] Mostrar departamento de origen, documento, autorización, tesorería, contaduría, asiento, diario, mayor y balance.
- [x] Implementar enlaces entre etapas.
- [x] Mostrar estados y fechas de cada etapa.
- [x] Crear recorrido guiado con los 13 pasos del criterio de aceptación.
- [x] Implementar modo presentación opcional.
- [x] Verificar que una operación nueva recorra todas las etapas.

**Implementación**

- `src/core/trazabilidad.ts`: construye las nueve etapas de una compra o venta, con estado, fecha, referencia, importe y enlace a la pantalla donde ocurre cada paso.
- `src/core/recorrido.ts`: arma los 13 pasos del criterio de aceptación enlazando una compra y una venta concretas.
- `src/stores/recorrido.ts`: mantiene el recorrido abierto y el paso actual aunque se navegue entre módulos.
- `src/components/recorrido/RecorridoGuiado.vue`: barra global con progreso, pasos, atajos de teclado y modo presentación.
- `src/views/TrazabilidadView.vue`: selector compra/venta, resumen del circuito, nueve etapas enlazadas, verificación y recorrido guiado de 13 pasos.
- Enlaces profundos incorporados en Compras, Ventas, Tesorería, Contaduría, Libros y Balances para abrir directamente la operación, el comprobante, el asiento o la cuenta involucrada.

**Verificación**

- La compra demo `C-001` recorre origen, factura, pago, Contaduría, autorización, asiento, Diario, Mayor y Balance.
- La venta demo `V-001` recorre origen, factura, cobro, Contaduría, autorización, asiento, Diario, Mayor y Balance.
- Una compra nueva registrada en la prueba automatizada completa las nueve etapas al aprobar su documento y registrar el pago total.
- 129 tests aprobados; `typecheck`, `lint`, `format:check` y build de producción correctos.

**Entregable:** pantalla de trazabilidad y demo guiada.

**Criterio de aceptación**

- Se puede seguir una compra desde su origen hasta el balance.
- Se puede seguir una venta y su cobro.
- Cada etapa enlaza a la pantalla correspondiente.
- El recorrido guiado permite presentar sin buscar pantallas manualmente.

---

### F13 — Informes y configuración

**Estado:** Completado
**Depende de:** F2 a F11
**Objetivo:** completar la experiencia con reportes y ajustes de la demo.

**Tareas**

- [x] Crear informes de ventas por cliente, compras por proveedor, IVA del período y top de productos.
- [x] Agregar filtros por período.
- [x] Agregar exportación CSV.
- [x] Crear pantalla de configuración con datos de la empresa.
- [x] Implementar carga y previsualización de logo.
- [x] Implementar restauración de datos demo con confirmación.
- [x] Mostrar versión del esquema y uso de almacenamiento.
- [x] Agregar datos de usuario ficticio.
- [x] Verificar que la configuración persista.

**Implementación**

- `src/core/informes.ts`: filtros por período y construcción de los cuatro reportes a partir de operaciones con documento registrado. Los cobros y pagos aplicados incluyen todos los comprobantes registrados de cada operación, aunque su fecha esté fuera del rango consultado.
- `src/core/informes.ts`: exportación CSV estándar con comas, CRLF, escapes, importes en pesos con dos decimales y descarga con BOM UTF-8.
- `src/views/InformesView.vue`: pantalla con pestañas sincronizadas con `?vista=`, filtro de fechas, resumen del período, tablas por cliente/proveedor, liquidación de IVA por alícuota y ranking de productos.
- `src/views/ConfiguracionView.vue`: edición y guardado de datos de empresa y usuario ficticio, carga/reemplazo/eliminación de logo con previsualización, versión del esquema, uso estimado de `localStorage`, cantidad de registros y restauración demo con confirmación.
- `src/core/persistencia.ts` y `src/stores/contabilidad.ts`: persistencia del usuario y la empresa, compatibilidad con estados guardados sin usuario y cálculo del espacio utilizado.
- `src/data/catalogos.ts` y `src/data/demo.ts`: usuario demo inicial y datos de empresa restaurados por el reset.
- Navegación y router: ruta `/informes` con submenú por reporte y `/configuracion` con la pantalla completa.

**Verificación**

- Los totales de ventas, compras, IVA y top de productos coinciden con las operaciones registradas del período; las facturas pendientes `V-008` y `C-008` no alteran los reportes.
- Los cobros y pagos aplicados se computan aunque hayan ocurrido fuera del rango de fechas consultado.
- La exportación CSV se descarga con encabezados, totales, escapes y BOM UTF-8.
- Los cambios de empresa, usuario y logo persisten al recargar; la restauración demo recupera la empresa, el usuario, el logo, los maestros y las operaciones originales.
- 152 tests aprobados; `typecheck`, `lint`, `format:check` y build de producción correctos.

**Entregable:** informes y configuración funcionales.

**Criterio de aceptación**

- Los informes coinciden con las operaciones registradas.
- El CSV se descarga correctamente.
- El logo se puede cargar y se conserva.
- La restauración devuelve el estado inicial.

---

### F14 — QA, build y entrega

**Estado:** Pendiente
**Depende de:** todas las anteriores
**Objetivo:** cerrar la calidad, empaquetar y documentar la entrega.

**Tareas**

- [ ] Ejecutar todos los tests unitarios.
- [ ] Verificar `pnpm typecheck`.
- [ ] Verificar `pnpm build`.
- [ ] Verificar `pnpm preview`.
- [ ] Probar la aplicación en 1440, 1024 y 768 px.
- [ ] Revisar accesibilidad básica: foco, teclado, labels y contraste.
- [ ] Revisar que no haya botones decorativos sin acción.
- [ ] Revisar que no haya pantallas vacías ni lorem ipsum.
- [ ] Ejecutar el recorrido de aceptación completo.
- [ ] Generar build autónomo opcional.
- [ ] Escribir README con instalación, navegación, flujo contable, reset y logo.
- [ ] Preparar carpeta final de entrega.
- [ ] Actualizar este plan con el estado final.

**Entregable:** prototipo listo para presentar.

**Criterio de aceptación**

- Se completan los 13 pasos del criterio final.
- No hay errores de consola.
- No hay diferencias entre Debe y Haber.
- La aplicación se puede ejecutar localmente con instrucciones claras.

---

## 7. Requisitos transversales

Estas reglas aplican a todas las fases:

- [ ] Toda la interfaz en español.
- [ ] Moneda ARS con formato `$ 1.250.000,00`.
- [ ] Fechas `DD/MM/AAAA`.
- [ ] Datos ficticios, sin información personal o fiscal real.
- [ ] Sin backend, autenticación real ni integración fiscal.
- [ ] Sin duplicación de registraciones contables.
- [ ] Todo asiento debe cumplir Debe = Haber.
- [ ] El Mayor se deriva del Diario.
- [ ] El Balance se deriva del Mayor.
- [ ] Los estados se derivan del Balance.
- [ ] Los movimientos de tesorería se vinculan con su comprobante.
- [ ] Los formularios tienen validaciones visuales.
- [ ] Las tablas tienen datos, filtros y estados vacíos.
- [ ] Las acciones destructivas piden confirmación.
- [ ] Las notificaciones distinguen éxito, advertencia y error.
- [ ] La interfaz es responsive para computadoras y tablets.
- [ ] Los modales se cierran con Escape y atrapan el foco.
- [ ] El logo no se inventa: se usa el provisto o un placeholder explícito.

---

## 8. Criterio de aceptación final

Recorrido que debe poder hacerse frente al cliente:

1. [ ] Ingresar al Dashboard.
2. [ ] Registrar una compra.
3. [ ] Visualizar la factura recibida.
4. [ ] Registrar el pago al proveedor.
5. [ ] Ingresar a Contaduría.
6. [ ] Revisar la documentación de la operación.
7. [ ] Aprobar y generar el asiento contable.
8. [ ] Consultar el asiento en el Libro Diario.
9. [ ] Seleccionar una cuenta en el Libro Mayor y visualizar el movimiento.
10. [ ] Consultar el balance de comprobación.
11. [ ] Realizar una operación de venta.
12. [ ] Registrar su posterior cobro.
13. [ ] Comprobar cómo se actualiza la información contable.

**Resultado esperado:** que el cliente comprenda que el sistema conecta todos los departamentos y transforma operaciones comerciales en información contable ordenada, verificable y útil.

---

## 9. Registro de avances

| Fecha | Fase | Cambio | Estado |
|---|---|---|---|
| 03/11/2026 | F0 | Relevamiento del prompt, requerimientos y borrador del TP. | Completado |
| 03/11/2026 | F0 | Decisiones de stack, marca, contabilidad y estados cerradas. | Completado |
| 03/11/2026 | F0 | Verificación de Vite 8.3.5 y requisitos de Node. | Completado |
| 03/11/2026 | F0 | Plan de desarrollo creado en `planes/PLAN-DESARROLLO.md`. | Completado |
| 03/11/2026 | F0 | Node actualizado a 26.13.0 LTS y configurado como default en `.zshrc`. | Completado |
| 03/11/2026 | F0 | pnpm actualizado a 12.16.1. | Completado |
| 03/11/2026 | F0 | Smoke test de Vite 8.3.5 + Vue 3.5.44 + TypeScript 6.0.3 con `pnpm build`. | Completado |
| 03/11/2026 | F1 | Proyecto `enigma-contabilidad/` creado con Vite 8.3.5, Vue 3.5.44 y TypeScript 6.0.3. | Completado |
| 03/11/2026 | F1 | Dependencias instaladas: Vue Router 5.4.0, Pinia 4.1.0, Chart.js, vue-chartjs, `@lucide/vue` e Inter. | Completado |
| 03/11/2026 | F1 | Tooling configurado: Vitest, Vue Test Utils, jsdom, ESLint, Prettier, scripts y alias `@/`. | Completado |
| 03/11/2026 | F1 | Router hash, Pinia, layout provisional y rutas de todos los módulos creados. | Completado |
| 03/11/2026 | F1 | Verificados `dev`, `build`, `test`, `typecheck`, `lint` y `format:check`. | Completado |
| 03/11/2026 | F2 | Tipos de dominio, helpers monetarios y plan de cuentas jerárquico creados. | Completado |
| 03/11/2026 | F2 | Catálogos demo y semilla completa: 8 compras, 8 ventas, 5 pagos, 5 cobros y transferencia interna. | Completado |
| 03/11/2026 | F2 | Motor de asientos con partida doble, numeración y validación implementado. | Completado |
| 03/11/2026 | F2 | Derivaciones Diario → Mayor → Balance → ER/ESP, tesorería, stock y terceros implementadas. | Completado |
| 03/11/2026 | F2 | Persistencia versionada en `localStorage`, restauración demo y aprobación idempotente implementadas. | Completado |
| 03/11/2026 | F2 | 49 tests aprobados; `typecheck`, `lint` y `format:check` sin errores. | Completado |
| 04/11/2026 | F6 | Módulo de ventas implementado: listado, formulario, factura emitida, cuenta por cobrar y asiento balanceado. | Completado |
| 04/11/2026 | F7 | Módulo de maestros implementado: proveedores, clientes y productos con alta, edición, ficha, saldo, historial y eliminación protegida. | Completado |
| 04/11/2026 | F8 | Módulo de tesorería implementado: pagos, cobros, movimientos de fondos y transferencias con validaciones e idempotencia. | Completado |
| 04/11/2026 | F9 | Módulo de contaduría implementado: bandeja de documentos, asientos contables y plan de cuentas. | Completado |
| 04/11/2026 | F10 | Módulo de libros contables implementado: Libro Diario y Libro Mayor derivados de los asientos registrados. | Completado |
| 05/11/2026 | F11 | Módulo de balances y estados implementado: comprobación, ESP, ER, flujo de efectivo, evolución del patrimonio neto, detalle e impresión. | Completado |
| 05/11/2026 | F11 | Verificaciones de coherencia entre estados y asientos registrados; 102 tests aprobados y build de producción correcto. | Completado |
| 05/11/2026 | F12 | Pantalla de trazabilidad implementada: selector compra/venta, nueve etapas con estado, fecha, referencia, importe y enlace a su pantalla. | Completado |
| 05/11/2026 | F12 | Recorrido guiado global de 13 pasos con navegación automática, atajos de teclado y modo presentación. | Completado |
| 05/11/2026 | F12 | Enlaces profundos agregados en Compras, Ventas, Tesorería, Contaduría, Libros y Balances. | Completado |
| 05/11/2026 | F12 | Verificación de compra nueva recorriendo las nueve etapas; 129 tests aprobados y build de producción correcto. | Completado |
| 05/11/2026 | F13 | Informes implementados: ventas por cliente, compras por proveedor, IVA por alícuota y top de productos con filtro de período. | Completado |
| 05/11/2026 | F13 | Exportación CSV con escapes, CRLF, totales, importes en pesos y BOM UTF-8; pestañas y submenú sincronizados con la ruta. | Completado |
| 05/11/2026 | F13 | Configuración completa: empresa y usuario editables, logo con previsualización, versión de esquema, uso de almacenamiento y reset demo. | Completado |
| 05/11/2026 | F13 | Persistencia de usuario/empresa con compatibilidad hacia atrás; 152 tests aprobados y build de producción correcto. | Completado |

---

## 10. Riesgos y notas abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Node 26 incompatible con alguna dependencia | Medio | Smoke test superado; Node 24.22.2 LTS disponible como fallback |
| Cambios de major en Vue Router 5 / Pinia 4 | Bajo | Versiones exactas fijadas y validadas en F1 (vue-router 5.4.0, pinia 4.1.0) |
| La imagen del DOCX no sea el logo definitivo | Bajo | Placeholder explícito y carga desde Configuración |
| Vite estándar no abre con `file://` | Medio | Script opcional `build:single` y README claro |
| Incoherencia de datos demo | Alto | Motor derivado + tests de invariantes |
| Redondeo de importes | Medio | Importes internos en centavos |
| Falta de tiempo para todas las fases | Medio | Fases independientes; priorizar recorrido de aceptación |
| Pérdida de datos por cambio de esquema | Bajo | Clave de localStorage versionada y reset |

---

## 11. Próximos pasos inmediatos

1. [x] Completar F0: instalar Node 26.13.0 LTS y pnpm 12.16.1.
2. [x] Ejecutar smoke test de Vite 8 + Vue 3 + TypeScript.
3. [x] Actualizar la tabla de entorno y marcar F0 como completada.
4. [x] Completar F1: scaffold de `enigma-contabilidad/` con router, Pinia y tooling.
5. [x] Completar F2: tipos, datos demo, motor contable, persistencia y tests.
6. [x] Completar F3: design system, layout, sidebar, topbar y UI kit.
7. [ ] Iniciar F4: dashboard con indicadores, gráficos y pendientes.
