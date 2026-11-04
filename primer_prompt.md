# PROMPT — Desarrollo de prototipo visual de sistema de gestión contable | Enigma Solutions

## 1. ROL

Actúa como un equipo profesional compuesto por:

- Diseñador UX/UI especializado en sistemas ERP y software contable.
- Desarrollador Frontend senior especializado en HTML5, CSS3 y JavaScript.
- Analista funcional de sistemas de gestión empresarial.
- Contador especializado en contabilidad financiera y registración de operaciones comerciales.
- Consultor de software empresarial B2B.

Tu responsabilidad es diseñar y desarrollar un prototipo visual e interactivo de un sistema de gestión contable que será presentado comercialmente por la empresa **Enigma Solutions** a un potencial cliente.

El resultado debe tener una apariencia profesional, moderna y realista, similar a un software ERP comercial.

## 2. CONTEXTO DEL PROYECTO

Enigma Solutions es una empresa dedicada al desarrollo de software y soluciones informáticas.

La empresa busca presentar una propuesta de software de gestión empresarial que permita centralizar las operaciones administrativas, comerciales, financieras y contables de una organización.

El objetivo de esta demostración es mostrar cómo una operación comercial realizada en un departamento termina generando información contable que posteriormente se utiliza para elaborar los libros y estados contables.

Se necesita demostrar el recorrido completo:

```text
COMPRAS / VENTAS
       |
       v
DOCUMENTACIÓN COMERCIAL
       |
       v
TESORERÍA
       |
       v
CONTADURÍA
       |
       v
LIBRO DIARIO
       |
       v
LIBRO MAYOR
       |
       v
BALANCE DE COMPROBACIÓN
       |
       v
ESTADOS CONTABLES
```

## 3. OBJETIVO PRINCIPAL

Crear una aplicación web de demostración utilizando exclusivamente:

- VUEJS.
- HTML5.
- CSS3.
- TYPESCRIPT.

No utilizar backend, bases de datos, servidores ni frameworks obligatorios.

La aplicación debe funcionar abriendo el archivo `index.html` desde un navegador.

Toda la información será ficticia y estará destinada exclusivamente a demostrar el funcionamiento visual del sistema.

No desarrollar un sistema contable productivo ni implementar integraciones fiscales reales.

## 4. IDENTIDAD VISUAL Y DISEÑO

Diseñar una interfaz profesional de software empresarial.

### Estilo visual

- Diseño moderno, limpio y minimalista.
- Interfaz similar a un ERP comercial.
- Navegación lateral izquierda.
- Barra superior con información del usuario.
- Panel principal con tarjetas, indicadores y tablas.
- Formularios con validaciones visuales.
- Ventanas modales para operaciones.
- Notificaciones de éxito, advertencia y error.
- Diseño responsive para computadoras y tablets.

### Identidad de marca

Nombre comercial: Enigma Solutions.

Utilizar una identidad visual corporativa coherente con una empresa de tecnología.

Reservar un espacio para incorporar el logotipo original de Enigma Solutions, que será proporcionado posteriormente.

No inventar ni reemplazar el logotipo original.

### Idioma y formato

Toda la aplicación debe estar en español.

Utilizar:
- Moneda: Peso argentino (ARS).
- Formato monetario: $ 1.250.000,00.
- Fechas: DD/MM/AAAA.
- Zona horaria: Argentina.
- Terminología contable utilizada en Argentina.

## 5. ESTRUCTURA GENERAL DE LA APLICACIÓN

La aplicación deberá contar con las siguientes secciones en el menú lateral:

1. Dashboard.
2. Compras.
3. Ventas.
4. Proveedores.
5. Clientes.
6. Tesorería.
   - Pagos.
   - Cobros.
   - Movimientos de fondos.
7. Contaduría.
   - Bandeja de documentación pendiente.
   - Asientos contables.
   - Plan de cuentas.
8. Libros contables.
   - Libro Diario.
   - Libro Mayor.
9. Balances.
   - Balance de comprobación.
   - Estado de Situación Patrimonial.
   - Estado de Resultados.
10. Informes.
11. Configuración.

Cada sección debe ser navegable desde el menú lateral sin recargar la página.

## 6. DASHBOARD PRINCIPAL

Crear un panel de inicio que muestre una visión general de la empresa.

Incluir tarjetas con:

- Ventas del mes.
- Compras del mes.
- Cuentas por cobrar.
- Cuentas por pagar.
- Saldo disponible en caja y bancos.
- Resultado del ejercicio.

Agregar:

- Gráfico de ingresos y egresos.
- Últimas operaciones realizadas.
- Documentos pendientes de aprobación.
- Operaciones pendientes de registración contable.
- Accesos rápidos a compras, ventas, pagos y cobros.

Utilizar información ficticia coherente con los registros del sistema.

## 7. MÓDULO DE COMPRAS

Desarrollar una pantalla para administrar las compras de la organización.

### Funcionalidades visuales

- Listado de compras.
- Búsqueda por proveedor.
- Filtros por fecha y estado.
- Botón para registrar una nueva compra.
- Detalle de cada operación.
- Visualización de comprobantes.

### Formulario de compra

Campos:

- Proveedor.
- CUIT ficticio.
- Fecha.
- Tipo de comprobante.
- Número de comprobante.
- Condición de pago.
- Productos o servicios.
- Cantidad.
- Precio unitario.
- IVA.
- Subtotal.
- Total.

Al confirmar una compra, generar una representación visual de la factura recibida.

La operación deberá quedar disponible para su posterior revisión contable.

## 8. MÓDULO DE VENTAS

Desarrollar una interfaz para administrar las ventas.

### Funcionalidades

- Listado de ventas.
- Registro de nuevas ventas.
- Consulta de clientes.
- Detalle de productos o servicios.
- Visualización de facturas emitidas.
- Estado de cobranza.

### Formulario de venta

Campos:

- Cliente.
- CUIT ficticio.
- Fecha.
- Tipo de comprobante.
- Número de comprobante.
- Condición de venta.
- Descripción del producto o servicio.
- Cantidad.
- Precio unitario.
- IVA.
- Subtotal.
- Total.

Al confirmar una venta, generar una factura ficticia y actualizar los registros correspondientes.

## 9. MÓDULO DE TESORERÍA

Este módulo debe permitir visualizar los movimientos de dinero de la organización.

### 9.1. Pagos

Mostrar:

- Proveedor.
- Factura relacionada.
- Importe pendiente.
- Fecha de vencimiento.
- Medio de pago.
- Estado del pago.

Permitir registrar un pago total o parcial.

Al confirmar el pago:

1. Actualizar el saldo pendiente del proveedor.
2. Generar un comprobante de pago.
3. Generar el movimiento correspondiente de tesorería.
4. Enviar la operación a la bandeja de Contaduría.

### 9.2. Cobros

Mostrar:

- Cliente.
- Factura relacionada.
- Importe pendiente.
- Fecha de vencimiento.
- Medio de cobro.
- Estado del cobro.

Permitir registrar cobros totales o parciales.

Al confirmar el cobro:

1. Actualizar el saldo pendiente del cliente.
2. Generar un recibo ficticio.
3. Registrar el ingreso de dinero.
4. Enviar la operación a la bandeja de Contaduría.

### 9.3. Movimientos de fondos

Mostrar:

- Fecha.
- Descripción.
- Cuenta de origen.
- Cuenta de destino.
- Ingreso.
- Egreso.
- Saldo.

Diferenciar caja, bancos y otros medios de pago.

## 10. MÓDULO DE CONTADURÍA

Este es uno de los módulos más importantes de la demostración.

Debe mostrar cómo la información generada por Compras, Ventas y Tesorería llega al departamento contable.

### 10.1. Bandeja de documentación pendiente

Crear una pantalla que permita al contador visualizar todas las operaciones pendientes de revisión.

Columnas:

- Fecha.
- Número de documento.
- Tipo de operación.
- Departamento de origen.
- Cliente o proveedor.
- Importe.
- Estado.
- Acción.

Estados posibles:

- Pendiente de revisión.
- En revisión.
- Aprobado.
- Registrado.
- Observado.

Al abrir una operación, mostrar un detalle con:

- Documento original simulado.
- Información comercial.
- Importes e impuestos.
- Cuenta contable sugerida.
- Asiento contable propuesto.

El contador deberá poder revisar la operación y aprobar o rechazar la registración.

### 10.2. Generación de asientos contables

Una vez aprobada una operación, permitir visualizar su asiento contable.

Mostrar claramente:

| Cuenta contable | Debe | Haber |
|---|---:|---:|
| Cuenta correspondiente | Importe | |
| Cuenta correspondiente | | Importe |
| Total | Importe | Importe |

El asiento debe estar balanceado.

Incluir:

- Número de asiento.
- Fecha.
- Concepto.
- Documento de origen.
- Cuentas contables.
- Importe del Debe.
- Importe del Haber.
- Estado de registración.

Permitir consultar el asiento y sus documentos relacionados.

**Importante:** no registrar automáticamente operaciones duplicadas. Cada documento debe tener una única registración contable correspondiente.

## 11. PLAN DE CUENTAS

Crear una pantalla que muestre un plan de cuentas jerárquico.

Utilizar una estructura contable de ejemplo:

```text
1 ACTIVO
  1.1 ACTIVO CORRIENTE
    1.1.01 Caja
    1.1.02 Banco
    1.1.03 Deudores por ventas
    1.1.04 IVA Crédito Fiscal
    1.1.05 Mercaderías

2 PASIVO
  2.1 PASIVO CORRIENTE
    2.1.01 Proveedores
    2.1.02 IVA Débito Fiscal

3 PATRIMONIO NETO
  3.1 Capital

4 INGRESOS
  4.1 Ventas
  4.2 Servicios prestados

5 GASTOS
  5.1 Compras y costos
  5.2 Gastos administrativos
  5.3 Servicios contratados
```

Permitir visualizar código, nombre, tipo y naturaleza de cada cuenta.

## 12. LIBRO DIARIO

Crear una pantalla profesional que represente el Libro Diario.

Debe mostrar los asientos contables ordenados cronológicamente.

Columnas:

- Fecha.
- Número de asiento.
- Código de cuenta.
- Nombre de cuenta.
- Descripción.
- Debe.
- Haber.

Incluir:

- Filtro por fecha.
- Búsqueda por número de asiento.
- Búsqueda por cuenta contable.
- Totales del Debe y Haber.
- Indicador de igualdad entre ambos importes.
- Acceso al comprobante que originó el asiento.

Permitir abrir un asiento para visualizar su detalle.

El Libro Diario debe alimentarse de los asientos aprobados y registrados en Contaduría.

## 13. LIBRO MAYOR

Crear una pantalla que permita seleccionar una cuenta contable y consultar sus movimientos.

Ejemplo: Cuenta Proveedores.

Mostrar:

| Fecha | Asiento | Concepto | Debe | Haber | Saldo |
|---|---|---|---:|---:|---:|

Incluir:

- Selector de cuenta.
- Saldo inicial.
- Movimientos del período.
- Total del Debe.
- Total del Haber.
- Saldo final.
- Filtros por período.
- Acceso al asiento original.

El Libro Mayor debe generarse a partir de los movimientos del Libro Diario, no mediante una carga independiente.

## 14. BALANCE DE COMPROBACIÓN

Crear una pantalla para mostrar las sumas y saldos de las cuentas contables.

Columnas:

- Código.
- Cuenta.
- Sumas del Debe.
- Sumas del Haber.
- Saldo deudor.
- Saldo acreedor.

Al final mostrar los totales generales.

Debe poder visualizarse si existe igualdad entre los movimientos del Debe y el Haber.

Incluir un botón para consultar el detalle de cada cuenta.

## 15. ESTADOS CONTABLES

Crear dos pantallas de demostración:

### 15.1. Estado de Situación Patrimonial

Mostrar:

- Activo corriente.
- Activo no corriente.
- Total del activo.
- Pasivo corriente.
- Pasivo no corriente.
- Total del pasivo.
- Patrimonio neto.

Verificar la igualdad:

Activo = Pasivo + Patrimonio Neto.

### 15.2. Estado de Resultados

Mostrar:

- Ventas netas.
- Costo de ventas.
- Resultado bruto.
- Gastos operativos.
- Resultado operativo.
- Resultado antes de impuestos.
- Resultado del ejercicio.

Los estados contables deberán utilizar datos coherentes con los registros contables de demostración.

## 16. FLUJO DE TRABAJO INTEGRADO

Este apartado es fundamental.

La aplicación debe permitir demostrar visualmente cómo una operación atraviesa diferentes departamentos.

Implementar un ejemplo completo de compra:

```text
1. COMPRAS
   Se registra una compra a un proveedor.
          |
          v
2. DOCUMENTACIÓN
   Se genera una factura recibida.
          |
          v
3. TESORERÍA
   Se registra el pago cuando corresponda.
          |
          v
4. CONTADURÍA
   Se recibe la documentación.
          |
          v
5. LIBRO DIARIO
   Se registra el asiento contable.
          |
          v
6. LIBRO MAYOR
   Se actualizan las cuentas involucradas.
          |
          v
7. BALANCE
   Se actualizan los saldos contables.
```

Implementar también un ejemplo de venta y su posterior cobro.

Incluir una pantalla llamada **Trazabilidad de operaciones**, en la que se pueda seleccionar una operación y observar:

- Departamento que originó la operación.
- Documento generado.
- Estado de autorización.
- Movimiento de tesorería relacionado.
- Asiento contable generado.
- Asiento en el Libro Diario.
- Movimientos en el Libro Mayor.
- Impacto en los balances.

La navegación debe permitir pasar de una etapa a otra mediante enlaces o botones.

## 17. DATOS DE DEMOSTRACIÓN

Crear información ficticia coherente para que el sistema se vea completo desde el primer inicio.

Utilizar una empresa cliente ficticia:

**Empresa:** Comercializadora del Sur S.R.L.

Crear:

- 5 proveedores.
- 5 clientes.
- 10 productos o servicios.
- 8 compras.
- 8 ventas.
- 5 pagos.
- 5 cobros.
- Asientos contables relacionados.
- Movimientos de Libro Mayor.
- Balance de comprobación.

Todos los datos deben tener coherencia entre sí.

Utilizar importes en pesos argentinos y fechas ficticias de noviembre de 2026.

No utilizar información personal o fiscal real.

## 18. FUNCIONALIDAD TYPESCRIPT

Aunque sea una demostración, los controles principales deben funcionar.

Implementar:

- Navegación entre módulos.
- Formularios para registrar operaciones.
- Validaciones de campos.
- Búsqueda y filtros.
- Tablas dinámicas.
- Ventanas modales.
- Confirmaciones de acciones.
- Notificaciones visuales.
- Actualización de indicadores.
- Generación simulada de documentos.
- Generación de asientos contables.
- Actualización del Libro Diario.
- Actualización del Libro Mayor.
- Actualización del balance de comprobación.

Utilizar `localStorage` para conservar los datos ficticios entre recargas.

Agregar una opción para restaurar los datos originales de demostración.

No implementar autenticación real, integración bancaria ni emisión fiscal oficial.

## 19. ARQUITECTURA DE ARCHIVOS

Organizar el proyecto de forma clara:

```text
enigma-contabilidad/
│
├── index.html
│
├── css/
│   ├── styles.css
│   ├── layout.css
│   └── components.css
│
├── js/
│   ├── app.js
│   ├── data.js
│   ├── navigation.js
│   ├── compras.js
│   ├── ventas.js
│   ├── tesoreria.js
│   ├── contabilidad.js
│   ├── libro-diario.js
│   ├── libro-mayor.js
│   ├── balances.js
│   └── utils.js
│
└── assets/
    └── logo.png
```

Se permite modificar esta estructura si existe una justificación técnica.

Se pueden utilizar bibliotecas externas mediante CDN para iconos o gráficos.

## 20. CALIDAD VISUAL

El resultado debe parecer un producto comercial que una empresa de software presentaría a un cliente.

Evitar:

- Interfaces genéricas.
- Pantallas vacías.
- Botones decorativos sin funcionalidad.
- Tablas sin datos.
- Formularios sin validaciones.
- Colores excesivamente llamativos.
- Diseños que parezcan trabajos escolares básicos.
- Información contable incoherente.

Priorizar:

- Jerarquía visual.
- Legibilidad.
- Consistencia entre pantallas.
- Tablas profesionales.
- Indicadores claros.
- Navegación intuitiva.
- Información contable fácil de interpretar.

## 21. REGLAS CONTABLES OBLIGATORIAS

La demostración debe respetar los principios básicos de la partida doble.

1. Todo asiento contable debe cumplir Debe = Haber.
2. Una factura de compra a crédito genera una obligación con el proveedor.
3. El pago posterior cancela total o parcialmente esa obligación.
4. Una factura de venta a crédito genera un derecho de cobro.
5. El cobro posterior cancela total o parcialmente ese derecho.
6. El Libro Mayor debe derivarse de los movimientos del Libro Diario.
7. El balance de comprobación debe derivarse de los saldos del Libro Mayor.
8. Los movimientos de tesorería deben relacionarse con sus comprobantes.
9. No duplicar registraciones contables.
10. Mantener la referencia documental de cada asiento.

Para los ejemplos con IVA, separar correctamente las cuentas de IVA Crédito Fiscal e IVA Débito Fiscal cuando corresponda.

Los ejemplos deben representar operaciones comerciales ficticias y no sustituir el criterio profesional de un contador.

## 22. FORMA DE ENTREGA

Desarrollar el proyecto completo.

Entregar:

1. Todos los archivos HTML.
2. Todos los archivos CSS.
3. Todos los archivos TypeScript.
4. Datos de demostración.
5. Instrucciones para ejecutar el prototipo.
6. Una breve explicación de la navegación.
7. Una explicación del flujo de trabajo contable implementado.

No entregar solamente capturas de pantalla, diseños estáticos o fragmentos de código.

La aplicación debe poder ejecutarse localmente.

## 23. CRITERIO FINAL DE ACEPTACIÓN

El prototipo se considerará satisfactorio cuando sea posible realizar la siguiente demostración frente a un cliente:

1. Ingresar al Dashboard.
2. Registrar una compra.
3. Visualizar la factura recibida.
4. Registrar el pago al proveedor.
5. Ingresar a Contaduría.
6. Revisar la documentación de la operación.
7. Aprobar y generar el asiento contable.
8. Consultar el asiento en el Libro Diario.
9. Seleccionar una cuenta en el Libro Mayor y visualizar el movimiento.
10. Consultar el balance de comprobación.
11. Realizar una operación de venta.
12. Registrar su posterior cobro.
13. Comprobar cómo se actualiza la información contable.

**El objetivo principal es que el cliente comprenda que el sistema conecta todos los departamentos de la organización y transforma las operaciones comerciales en información contable ordenada, verificable y útil para la toma de decisiones.**
