<script setup lang="ts">
import { Download, Info, Plus, Trash } from '@lucide/vue'
import { computed, ref } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppTooltip from '@/components/ui/AppTooltip.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import CurrencyInput from '@/components/ui/CurrencyInput.vue'
import DataTable from '@/components/ui/DataTable.vue'
import DocumentViewer from '@/components/ui/DocumentViewer.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import TraceTimeline from '@/components/ui/TraceTimeline.vue'
import type {
  ColumnaTabla,
  DocumentoVista,
  OpcionSelect,
  PasoTimeline,
  TabItem,
  TipoBadge,
} from '@/components/ui/tipos'
import { formatearMoneda } from '@/core/dinero'
import { useContabilidadStore } from '@/stores/contabilidad'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const contabilidad = useContabilidadStore()

const nombre = ref('Compras')
const nombreError = ref('')
const condicion = ref('cuenta_corriente')
const observaciones = ref('Operación de compra con recepción parcial de mercadería.')
const acepta = ref(true)
const importe = ref(125000000)
const pagina = ref(2)
const tabActiva = ref('resumen')
const modalAbierto = ref(false)
const confirmacionAbierta = ref(false)

const opcionesCondicion: readonly OpcionSelect[] = [
  { valor: 'contado', etiqueta: 'Contado' },
  { valor: 'cuenta_corriente', etiqueta: 'Cuenta corriente' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta corporativa' },
  { valor: 'transferencia', etiqueta: 'Transferencia bancaria' },
]

const tabs: readonly TabItem[] = [
  { id: 'resumen', etiqueta: 'Resumen', badge: 3 },
  { id: 'movimientos', etiqueta: 'Movimientos', badge: 12 },
  { id: 'historial', etiqueta: 'Historial' },
  { id: 'archivados', etiqueta: 'Archivados', deshabilitada: true },
]

const columnas: readonly ColumnaTabla[] = [
  { clave: 'documento', titulo: 'Documento' },
  { clave: 'contraparte', titulo: 'Contraparte' },
  { clave: 'fecha', titulo: 'Fecha' },
  { clave: 'importe', titulo: 'Importe', alineacion: 'derecha' },
  { clave: 'estado', titulo: 'Estado', alineacion: 'centro' },
]

const filas: readonly Record<string, unknown>[] = [
  {
    id: 'F-001',
    documento: 'Factura A-0001-00000123',
    contraparte: 'Tecnología del Plata S.A.',
    fecha: '03/11/2026',
    importe: formatearMoneda(617100000),
    estado: 'Registrado',
  },
  {
    id: 'F-002',
    documento: 'Factura B-0002-00000084',
    contraparte: 'Distribuidora del Sur S.R.L.',
    fecha: '07/11/2026',
    importe: formatearMoneda(248050000),
    estado: 'Pendiente',
  },
  {
    id: 'F-003',
    documento: 'Recibo 0001-00000031',
    contraparte: 'Estudio Contable del Sur',
    fecha: '12/11/2026',
    importe: formatearMoneda(150000000),
    estado: 'Observado',
  },
]

function tipoBadge(valor: unknown): TipoBadge {
  if (valor === 'Registrado') return 'exito'
  if (valor === 'Observado') return 'advertencia'
  if (valor === 'Pendiente') return 'info'
  return 'neutral'
}

const pasos: readonly PasoTimeline[] = [
  {
    titulo: 'Compra registrada',
    fecha: '03/11/2026 · 09:14',
    descripcion: 'El documento ingresó desde el módulo de Compras.',
    estado: 'completado',
    to: '/compras',
  },
  {
    titulo: 'Factura recibida',
    fecha: '03/11/2026 · 09:15',
    descripcion: 'Se generó el comprobante simulado y la obligación con el proveedor.',
    estado: 'completado',
  },
  {
    titulo: 'Pago registrado',
    fecha: '10/11/2026 · 11:40',
    descripcion: 'Pago parcial por transferencia bancaria.',
    estado: 'completado',
    to: '/tesoreria',
  },
  {
    titulo: 'Revisión contable',
    fecha: '10/11/2026 · 15:02',
    descripcion: 'La documentación está en la bandeja de Contaduría para su aprobación.',
    estado: 'actual',
    to: '/contaduria',
  },
  {
    titulo: 'Registración en el Libro Diario',
    descripcion: 'El asiento se generará al aprobar la operación.',
    estado: 'pendiente',
    to: '/libros',
  },
]

const documento = computed<DocumentoVista>(() => {
  const empresa = contabilidad.estado.empresa
  return {
    tipoEtiqueta: 'Factura B',
    numero: '0002-00000147',
    fecha: '2026-11-12',
    estadoEtiqueta: 'Estado: registrada',
    emisor: {
      nombre: empresa.razonSocial,
      cuit: empresa.cuit,
      direccion: empresa.direccion,
      condicionIva: 'Responsable Inscripto',
      logoSrc: empresa.logoDataUrl,
    },
    receptor: {
      nombre: 'Estudio Contable del Sur',
      cuit: '30-71234567-8',
      direccion: 'Av. Alem 450, Bahía Blanca',
      condicionIva: 'Responsable Inscripto',
    },
    items: [
      {
        descripcion: 'Notebook profesional 14 pulgadas',
        cantidad: 2,
        precioUnitario: 125000000,
        alicuotaIva: 21,
      },
      {
        descripcion: 'Servicio de instalación y puesta en marcha',
        cantidad: 1,
        precioUnitario: 35000000,
        alicuotaIva: 21,
      },
    ],
    subtotal: 285000000,
    iva: 59850000,
    total: 344850000,
    observaciones:
      'Operación ficticia de demostración. El comprobante conserva la referencia documental para la trazabilidad contable.',
  }
})

function validarNombre(): void {
  nombreError.value = nombre.value.trim() ? '' : 'Ingresá un nombre para la operación.'
}

function irASeccion(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function guardarPagoDemo(): void {
  modalAbierto.value = false
  notificarDemo('exito')
}

function notificarDemo(tipo: 'exito' | 'error' | 'advertencia' | 'info'): void {
  const ejemplos = {
    exito: {
      titulo: 'Operación registrada',
      mensaje: 'El documento se guardó correctamente y quedó disponible en Contaduría.',
    },
    error: {
      titulo: 'No se pudo registrar',
      mensaje: 'Revisá los datos obligatorios antes de volver a intentar.',
    },
    advertencia: {
      titulo: 'Revisión pendiente',
      mensaje: 'El asiento figura como propuesto y todavía no afecta los libros.',
    },
    info: {
      titulo: 'Período de demostración',
      mensaje: 'Los datos corresponden a noviembre de 2026.',
    },
  }
  ui.notificar({ tipo, ...ejemplos[tipo] })
}

function confirmarDemo(): void {
  confirmacionAbierta.value = false
  ui.notificar({
    tipo: 'advertencia',
    titulo: 'Acción confirmada',
    mensaje: 'La confirmación se resolvió desde el diálogo reutilizable.',
  })
}
</script>

<template>
  <section class="page">
    <div class="page__header">
      <div>
        <h2>UI Kit</h2>
        <p class="page__lead">
          Catálogo interno de tokens y componentes reutilizables. Cada pieza muestra sus estados
          normal, hover, foco, deshabilitado y error para revisar la consistencia del sistema.
        </p>
      </div>
      <AppBadge tipo="marca" punto>Fase 3</AppBadge>
    </div>

    <nav class="ui-kit-indice" aria-label="Secciones del UI Kit">
      <a href="#botones" @click.prevent="irASeccion('botones')"> Botones </a>
      <a href="#formularios" @click.prevent="irASeccion('formularios')"> Formularios </a>
      <a href="#datos" @click.prevent="irASeccion('datos')"> Datos </a>
      <a href="#retroalimentacion" @click.prevent="irASeccion('retroalimentacion')">
        Retroalimentación
      </a>
      <a href="#documentos" @click.prevent="irASeccion('documentos')"> Documentos </a>
    </nav>

    <section id="botones" class="ui-kit-seccion">
      <AppCard titulo="Botones" descripcion="Variantes, tamaños, estados y uso con iconos.">
        <div class="demo-stack">
          <div>
            <span class="demo-label">Variantes</span>
            <div class="demo-row">
              <AppButton variante="primario">Acción principal</AppButton>
              <AppButton variante="secundario">Acción secundaria</AppButton>
              <AppButton variante="fantasma">Acción terciaria</AppButton>
              <AppButton variante="exito">Confirmar</AppButton>
              <AppButton variante="peligro">Eliminar</AppButton>
            </div>
          </div>

          <div>
            <span class="demo-label">Tamaños y estados</span>
            <div class="demo-row">
              <AppButton tamano="sm">Pequeño</AppButton>
              <AppButton>Normal</AppButton>
              <AppButton tamano="lg">Grande</AppButton>
              <AppButton disabled>Deshabilitado</AppButton>
              <AppButton cargando>Procesando</AppButton>
              <AppButton variante="secundario" solo-icono aria-label="Agregar operación">
                <Plus :size="16" aria-hidden="true" />
              </AppButton>
              <AppButton variante="fantasma" solo-icono aria-label="Descargar">
                <Download :size="16" aria-hidden="true" />
              </AppButton>
              <AppButton variante="peligro" solo-icono aria-label="Eliminar registro">
                <Trash :size="16" aria-hidden="true" />
              </AppButton>
            </div>
          </div>

          <div>
            <span class="demo-label">Tooltip</span>
            <AppTooltip texto="Información adicional accesible con hover o foco">
              <AppButton variante="secundario" solo-icono aria-label="Mostrar ayuda">
                <Info :size="16" aria-hidden="true" />
              </AppButton>
            </AppTooltip>
          </div>
        </div>
      </AppCard>
    </section>

    <section id="formularios" class="ui-kit-seccion">
      <AppCard
        titulo="Formularios"
        descripcion="Campos con label, ayuda, error, foco y estados deshabilitados."
      >
        <div class="demo-form">
          <AppInput
            v-model="nombre"
            label="Nombre de la operación"
            hint="Ejemplo: compra de equipos informáticos."
            :error="nombreError"
            required
            @blur="validarNombre"
          />
          <AppInput
            label="CUIT del proveedor"
            model-value="30-71234567-8"
            hint="Formato ficticio de la demostración."
          />
          <AppInput
            label="Campo deshabilitado"
            model-value="No editable"
            disabled
            hint="Los campos deshabilitados no reciben foco."
          />
          <AppSelect
            v-model="condicion"
            label="Condición de pago"
            :opciones="opcionesCondicion"
            hint="Selección nativa accesible por teclado."
          />
          <AppInput
            label="Campo con error"
            model-value="Dato inválido"
            error="El importe debe ser mayor a cero."
          />
          <CurrencyInput
            v-model="importe"
            label="Importe"
            hint="Acepta coma decimal y puntos de miles. Se guarda en centavos."
          />
        </div>

        <div class="demo-stack" style="margin-top: var(--espacio-5)">
          <AppTextarea
            v-model="observaciones"
            label="Observaciones"
            hint="Máximo sugerido: 280 caracteres."
          />
          <AppCheckbox
            v-model="acepta"
            label="Confirmo que los datos son correctos"
            descripcion="La operación quedará disponible para revisión contable."
          />
          <AppCheckbox
            :model-value="false"
            label="Opción deshabilitada"
            descripcion="Este control no permite interacción."
            disabled
          />
        </div>
      </AppCard>
    </section>

    <section id="datos" class="ui-kit-seccion">
      <AppCard
        titulo="Badges, tarjetas y tablas"
        descripcion="Estados de documentos, contenedores y tabla con datos de demostración."
      >
        <div class="demo-stack">
          <div>
            <span class="demo-label">Badges</span>
            <div class="demo-row">
              <AppBadge>Neutral</AppBadge>
              <AppBadge tipo="marca">Marca</AppBadge>
              <AppBadge tipo="exito" punto>Registrado</AppBadge>
              <AppBadge tipo="advertencia" punto>Observado</AppBadge>
              <AppBadge tipo="error" punto>Rechazado</AppBadge>
              <AppBadge tipo="info" punto>Pendiente</AppBadge>
            </div>
          </div>

          <DataTable
            :columnas="columnas"
            :filas="filas"
            clave-fila="id"
            titulo="Documentos de demostración"
          >
            <template #celda-estado="{ valor }">
              <AppBadge :tipo="tipoBadge(valor)" punto>{{ valor }}</AppBadge>
            </template>
          </DataTable>

          <div>
            <span class="demo-label">Estado vacío de tabla</span>
            <DataTable
              :columnas="columnas"
              :filas="[]"
              vacio-titulo="No hay documentos para este filtro"
              vacio-mensaje="Probá con otro período o quitá los filtros aplicados."
            />
          </div>

          <AppPagination v-model:pagina="pagina" :total-paginas="12" :total-registros="142" />

          <EmptyState
            titulo="Todavía no hay operaciones"
            mensaje="Cuando registres la primera compra o venta, aparecerá en este listado."
          >
            <template #acciones>
              <AppButton tamano="sm" @click="notificarDemo('info')">Registrar operación</AppButton>
            </template>
          </EmptyState>
        </div>
      </AppCard>
    </section>

    <section id="retroalimentacion" class="ui-kit-seccion">
      <AppCard
        titulo="Retroalimentación y navegación"
        descripcion="Tabs, notificaciones, modal y confirmación de acciones destructivas."
      >
        <div class="demo-stack">
          <AppTabs v-model="tabActiva" :tabs="tabs">
            <template #panel-resumen>
              <p class="texto-suave">
                El panel de resumen conserva el contenido de la pestaña activa. Las pestañas se
                navegan con las flechas del teclado.
              </p>
            </template>
            <template #panel-movimientos>
              <p class="texto-suave">
                Doce movimientos del período de demostración, ordenados cronológicamente.
              </p>
            </template>
            <template #panel-historial>
              <p class="texto-suave">
                Historial de cambios y referencias documentales de la operación.
              </p>
            </template>
          </AppTabs>

          <div>
            <span class="demo-label">Notificaciones</span>
            <div class="demo-row">
              <AppButton variante="exito" tamano="sm" @click="notificarDemo('exito')">
                Éxito
              </AppButton>
              <AppButton variante="peligro" tamano="sm" @click="notificarDemo('error')">
                Error
              </AppButton>
              <AppButton variante="secundario" tamano="sm" @click="notificarDemo('advertencia')">
                Advertencia
              </AppButton>
              <AppButton variante="secundario" tamano="sm" @click="notificarDemo('info')">
                Información
              </AppButton>
            </div>
          </div>

          <div>
            <span class="demo-label">Diálogos</span>
            <div class="demo-row">
              <AppButton variante="secundario" @click="modalAbierto = true">
                Abrir modal
              </AppButton>
              <AppButton variante="peligro" @click="confirmacionAbierta = true">
                Pedir confirmación
              </AppButton>
            </div>
          </div>
        </div>
      </AppCard>
    </section>

    <section id="documentos" class="ui-kit-seccion">
      <AppCard
        titulo="Visor de documentos"
        descripcion="Comprobante simulado con encabezado, partes, ítems, totales y leyenda de demostración."
      >
        <DocumentViewer :documento="documento" />
      </AppCard>
    </section>

    <section class="ui-kit-seccion">
      <AppCard
        titulo="Timeline de trazabilidad"
        descripcion="Recorrido de una operación entre departamentos, con estados y enlaces."
      >
        <TraceTimeline :pasos="pasos" />
      </AppCard>
    </section>

    <AppModal
      v-model="modalAbierto"
      titulo="Registrar pago"
      descripcion="Ventana modal de ejemplo con foco atrapado y cierre con Escape."
    >
      <div class="demo-stack">
        <AppInput label="Proveedor" model-value="Tecnología del Plata S.A." readonly />
        <CurrencyInput v-model="importe" label="Importe a pagar" />
        <AppSelect v-model="condicion" label="Medio de pago" :opciones="opcionesCondicion" />
      </div>
      <template #pie>
        <AppButton variante="secundario" @click="modalAbierto = false">Cancelar</AppButton>
        <AppButton @click="guardarPagoDemo"> Registrar pago </AppButton>
      </template>
    </AppModal>

    <ConfirmDialog
      v-model="confirmacionAbierta"
      titulo="Eliminar documento"
      mensaje="Esta acción quitará el documento de la bandeja. En la demo no se eliminan datos contables registrados."
      confirmar-texto="Eliminar documento"
      :peligro="true"
      @confirmar="confirmarDemo"
    />
  </section>
</template>
