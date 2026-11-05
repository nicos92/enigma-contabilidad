<script setup lang="ts">
import {
  Building2,
  CheckCircle2,
  Database,
  HardDrive,
  Image,
  Palette,
  RotateCcw,
  Save,
  Trash,
  UserRound,
} from '@lucide/vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import {
  CLAVE_ALMACENAMIENTO,
  VERSION_ESQUEMA,
  obtenerUsoAlmacenamiento,
  type UsoAlmacenamiento,
} from '@/core/persistencia'
import { useContabilidadStore } from '@/stores/contabilidad'
import { useUiStore } from '@/stores/ui'
import type { DatosEmpresa, UsuarioDemo } from '@/types/contabilidad'

const contabilidad = useContabilidadStore()
const ui = useUiStore()

const empresa = computed(() => contabilidad.estado.empresa)
const logo = computed(() => empresa.value.logoDataUrl)
const refArchivo = ref<HTMLInputElement | null>(null)
const confirmarQuitar = ref(false)
const confirmarRestauracion = ref(false)

const formEmpresa = reactive<DatosEmpresa>({ ...contabilidad.estado.empresa })
const formUsuario = reactive<UsuarioDemo>({ ...contabilidad.estado.usuario })

function sincronizarFormularios(): void {
  Object.assign(formEmpresa, contabilidad.estado.empresa)
  Object.assign(formUsuario, contabilidad.estado.usuario)
}

/* -------------------------------------------------------------------------- */
/* Validación y guardado                                                      */
/* -------------------------------------------------------------------------- */

const erroresEmpresa = computed(() => ({
  razonSocial: formEmpresa.razonSocial.trim() ? undefined : 'Ingresá la razón social.',
  nombreComercial: formEmpresa.nombreComercial.trim() ? undefined : 'Ingresá el nombre comercial.',
  cuit: formEmpresa.cuit.trim() ? undefined : 'Ingresá el CUIT.',
  email:
    formEmpresa.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmpresa.email.trim())
      ? 'Ingresá un correo válido.'
      : undefined,
}))

const erroresUsuario = computed(() => ({
  nombre: formUsuario.nombre.trim() ? undefined : 'Ingresá el nombre del usuario.',
  rol: formUsuario.rol.trim() ? undefined : 'Ingresá el rol del usuario.',
  email:
    formUsuario.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formUsuario.email.trim())
      ? 'Ingresá un correo válido.'
      : undefined,
}))

const hayErrores = computed(
  () =>
    Object.values(erroresEmpresa.value).some(Boolean) ||
    Object.values(erroresUsuario.value).some(Boolean),
)

const hayCambios = computed(
  () =>
    JSON.stringify(formEmpresa) !== JSON.stringify(contabilidad.estado.empresa) ||
    JSON.stringify(formUsuario) !== JSON.stringify(contabilidad.estado.usuario),
)

function guardarConfiguracion(): void {
  if (hayErrores.value) {
    ui.notificar({
      tipo: 'error',
      titulo: 'Revisá los datos',
      mensaje: 'Hay campos obligatorios vacíos o con formato inválido.',
    })
    return
  }

  contabilidad.actualizarEmpresa({
    razonSocial: formEmpresa.razonSocial.trim(),
    nombreComercial: formEmpresa.nombreComercial.trim(),
    cuit: formEmpresa.cuit.trim(),
    actividad: formEmpresa.actividad.trim(),
    direccion: formEmpresa.direccion.trim(),
    telefono: formEmpresa.telefono.trim(),
    email: formEmpresa.email.trim(),
  })
  contabilidad.actualizarUsuario({
    nombre: formUsuario.nombre.trim(),
    rol: formUsuario.rol.trim(),
    email: formUsuario.email.trim(),
    area: formUsuario.area.trim(),
  })
  sincronizarFormularios()
  actualizarUso()

  ui.notificar({
    tipo: 'exito',
    titulo: 'Configuración guardada',
    mensaje: 'Los datos de la empresa y del usuario se conservarán al recargar la página.',
  })
}

/* -------------------------------------------------------------------------- */
/* Logo                                                                       */
/* -------------------------------------------------------------------------- */

const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp']
const PESO_MAXIMO = 1024 * 1024

function abrirSelector(): void {
  refArchivo.value?.click()
}

function alSeleccionarArchivo(evento: Event): void {
  const input = evento.target as HTMLInputElement
  const archivo = input.files?.[0]
  input.value = ''
  if (!archivo) return

  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    ui.notificar({
      tipo: 'error',
      titulo: 'Formato no admitido',
      mensaje: 'El logo debe ser una imagen PNG, JPG o WebP.',
    })
    return
  }

  if (archivo.size > PESO_MAXIMO) {
    ui.notificar({
      tipo: 'error',
      titulo: 'Archivo demasiado grande',
      mensaje: 'El logo no puede superar 1 MB para conservarse en el almacenamiento local.',
    })
    return
  }

  const lector = new FileReader()
  lector.onload = () => {
    if (typeof lector.result !== 'string') return
    contabilidad.actualizarEmpresa({ logoDataUrl: lector.result })
    formEmpresa.logoDataUrl = lector.result
    actualizarUso()
    ui.notificar({
      tipo: 'exito',
      titulo: 'Logo actualizado',
      mensaje: 'La nueva imagen ya se muestra en el sidebar y en los comprobantes.',
    })
  }
  lector.onerror = () => {
    ui.notificar({
      tipo: 'error',
      titulo: 'No se pudo leer el archivo',
      mensaje: 'Probá nuevamente con otra imagen.',
    })
  }
  lector.readAsDataURL(archivo)
}

function quitarLogo(): void {
  contabilidad.actualizarEmpresa({ logoDataUrl: null })
  formEmpresa.logoDataUrl = null
  confirmarQuitar.value = false
  actualizarUso()
  ui.notificar({
    tipo: 'advertencia',
    titulo: 'Logo eliminado',
    mensaje: 'Se volvió al espacio reservado con las iniciales EG.',
  })
}

/* -------------------------------------------------------------------------- */
/* Almacenamiento y restauración                                              */
/* -------------------------------------------------------------------------- */

const uso = ref<UsoAlmacenamiento>(obtenerUsoAlmacenamiento())

function actualizarUso(): void {
  uso.value = obtenerUsoAlmacenamiento()
}

onMounted(actualizarUso)
watch(() => contabilidad.estado, actualizarUso, { deep: true })

const formatoBytes = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

function formatearBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${formatoBytes.format(bytes / 1024)} KB`
  return `${formatoBytes.format(bytes / (1024 * 1024))} MB`
}

const registros = computed(
  () =>
    contabilidad.estado.compras.length +
    contabilidad.estado.ventas.length +
    contabilidad.estado.pagos.length +
    contabilidad.estado.cobros.length +
    contabilidad.estado.asientos.length,
)

function restaurarDemo(): void {
  contabilidad.restaurarDemo()
  sincronizarFormularios()
  confirmarRestauracion.value = false
  actualizarUso()
  ui.notificar({
    tipo: 'exito',
    titulo: 'Datos demo restaurados',
    mensaje:
      'Se recuperaron la empresa, el usuario, el logo, los maestros y las operaciones originales.',
  })
}
</script>

<template>
  <section class="page configuracion">
    <div class="page__header">
      <div>
        <h2>Configuración</h2>
        <p class="page__lead">
          Identidad de la empresa, usuario ficticio de la demo y administración de los datos
          almacenados en el navegador.
        </p>
      </div>
      <div class="page__actions">
        <AppBadge :tipo="hayCambios ? 'advertencia' : 'exito'" punto>
          {{ hayCambios ? 'Cambios sin guardar' : 'Configuración guardada' }}
        </AppBadge>
        <AppButton :disabled="!hayCambios" @click="guardarConfiguracion">
          <Save :size="16" aria-hidden="true" />
          Guardar cambios
        </AppButton>
      </div>
    </div>

    <AppCard
      titulo="Logotipo de la empresa"
      descripcion="La imagen se muestra en el sidebar, en el visor de documentos y en las facturas simuladas."
    >
      <div class="configuracion-logo">
        <div class="configuracion-logo__marco">
          <img v-if="logo" :src="logo" alt="Logo actual de la empresa" />
          <template v-else>
            <Image :size="28" aria-hidden="true" />
          </template>
        </div>

        <div class="configuracion-logo__texto">
          <p>
            Formatos admitidos: PNG, JPG o WebP. Tamaño máximo: 1 MB. Si no hay logo cargado se
            muestra el espacio provisorio con las iniciales <strong>EG</strong>.
          </p>
          <div class="configuracion-logo__acciones">
            <AppButton variante="primario" @click="abrirSelector">
              <Image :size="16" aria-hidden="true" />
              {{ logo ? 'Reemplazar logo' : 'Cargar logo' }}
            </AppButton>
            <AppButton v-if="logo" variante="secundario" @click="confirmarQuitar = true">
              <Trash :size="16" aria-hidden="true" />
              Quitar logo
            </AppButton>
            <input
              ref="refArchivo"
              class="configuracion-logo__archivo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              tabindex="-1"
              aria-hidden="true"
              @change="alSeleccionarArchivo"
            />
          </div>
          <AppBadge :tipo="logo ? 'exito' : 'neutral'" punto>
            {{ logo ? 'Logo personalizado activo' : 'Espacio provisorio activo' }}
          </AppBadge>
        </div>
      </div>
    </AppCard>

    <AppCard
      titulo="Datos de la empresa"
      descripcion="Información utilizada por los comprobantes, balances e informes de la demostración."
    >
      <template #encabezado>
        <h3 class="ui-card__titulo">
          <Building2 :size="18" aria-hidden="true" />
          Datos de la empresa
        </h3>
        <p class="ui-card__descripcion">
          Información utilizada por los comprobantes, balances e informes de la demostración.
        </p>
      </template>

      <div class="demo-form">
        <AppInput
          v-model="formEmpresa.razonSocial"
          label="Razón social"
          required
          :error="erroresEmpresa.razonSocial"
        />
        <AppInput
          v-model="formEmpresa.nombreComercial"
          label="Nombre comercial"
          required
          :error="erroresEmpresa.nombreComercial"
        />
        <AppInput v-model="formEmpresa.cuit" label="CUIT" required :error="erroresEmpresa.cuit" />
        <AppInput v-model="formEmpresa.actividad" label="Actividad" />
        <AppInput v-model="formEmpresa.direccion" label="Dirección" />
        <AppInput v-model="formEmpresa.telefono" label="Teléfono" type="tel" />
        <AppInput
          v-model="formEmpresa.email"
          label="Correo electrónico"
          type="email"
          :error="erroresEmpresa.email"
        />
      </div>
    </AppCard>

    <AppCard
      titulo="Usuario de la demo"
      descripcion="Datos ficticios de la sesión que se muestran en la barra superior."
    >
      <template #encabezado>
        <h3 class="ui-card__titulo">
          <UserRound :size="18" aria-hidden="true" />
          Usuario de la demo
        </h3>
        <p class="ui-card__descripcion">
          Datos ficticios de la sesión que se muestran en la barra superior.
        </p>
      </template>

      <div class="demo-form">
        <AppInput
          v-model="formUsuario.nombre"
          label="Nombre y apellido"
          required
          :error="erroresUsuario.nombre"
        />
        <AppInput v-model="formUsuario.rol" label="Rol" required :error="erroresUsuario.rol" />
        <AppInput v-model="formUsuario.area" label="Área" />
        <AppInput
          v-model="formUsuario.email"
          label="Correo electrónico"
          type="email"
          :error="erroresUsuario.email"
        />
      </div>
      <p class="configuracion-usuario__nota">
        <CheckCircle2 :size="15" aria-hidden="true" />
        El usuario es ficticio y no representa un sistema de autenticación real.
      </p>
    </AppCard>

    <AppCard
      titulo="Datos y almacenamiento"
      descripcion="Estado del esquema local y opción para recuperar la demostración original."
    >
      <div class="configuracion-sistema">
        <div class="configuracion-sistema__dato">
          <span class="configuracion-sistema__icono" aria-hidden="true">
            <Database :size="18" />
          </span>
          <div>
            <span>Versión del esquema</span>
            <strong>v{{ VERSION_ESQUEMA }}</strong>
            <small>Clave {{ CLAVE_ALMACENAMIENTO }}</small>
          </div>
        </div>

        <div class="configuracion-sistema__dato">
          <span class="configuracion-sistema__icono" aria-hidden="true">
            <HardDrive :size="18" />
          </span>
          <div>
            <span>Uso del almacenamiento</span>
            <strong>{{ formatearBytes(uso.bytesEstado) }}</strong>
            <small>
              {{
                uso.disponible
                  ? `${uso.porcentajeTotal.toFixed(2)}% del total estimado`
                  : 'No disponible en este navegador'
              }}
            </small>
          </div>
        </div>

        <div class="configuracion-sistema__dato">
          <span class="configuracion-sistema__icono" aria-hidden="true">
            <CheckCircle2 :size="18" />
          </span>
          <div>
            <span>Registros almacenados</span>
            <strong>{{ registros }}</strong>
            <small>Compras, ventas, pagos, cobros y asientos</small>
          </div>
        </div>
      </div>

      <div class="configuracion-restaurar">
        <div>
          <h4>Restaurar datos de demostración</h4>
          <p>
            Vuelve al estado inicial: empresa, usuario, logo, maestros, operaciones y asientos
            originales. Se perderán las modificaciones guardadas en este navegador.
          </p>
        </div>
        <AppButton variante="peligro" @click="confirmarRestauracion = true">
          <RotateCcw :size="16" aria-hidden="true" />
          Restaurar demo
        </AppButton>
      </div>
    </AppCard>

    <AppCard
      titulo="Sistema visual"
      descripcion="Los componentes, estados y tamaños están documentados en una ruta interna."
    >
      <div class="demo-row">
        <RouterLink class="ui-button ui-button--secundario" to="/ui-kit">
          <Palette :size="16" aria-hidden="true" />
          Abrir UI Kit
        </RouterLink>
        <span class="texto-suave">
          Revisá botones, formularios, tablas, modales, toasts, tabs y el visor de documentos.
        </span>
      </div>
    </AppCard>

    <ConfirmDialog
      v-model="confirmarQuitar"
      titulo="Quitar el logo"
      mensaje="Se eliminará la imagen actual y volverá el espacio provisorio con las iniciales EG. Podés cargar otro logo cuando quieras."
      confirmar-texto="Quitar logo"
      :peligro="true"
      @confirmar="quitarLogo"
    />

    <ConfirmDialog
      v-model="confirmarRestauracion"
      titulo="Restaurar datos de demostración"
      mensaje="Se reemplazarán todos los datos actuales por el estado demo original. Esta acción no se puede deshacer."
      confirmar-texto="Restaurar demo"
      :peligro="true"
      @confirmar="restaurarDemo"
    />
  </section>
</template>
