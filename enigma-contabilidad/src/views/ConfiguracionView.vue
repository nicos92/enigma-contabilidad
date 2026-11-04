<script setup lang="ts">
import { Image, Palette, Trash } from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useContabilidadStore } from '@/stores/contabilidad'
import { useUiStore } from '@/stores/ui'

const contabilidad = useContabilidadStore()
const ui = useUiStore()

const empresa = computed(() => contabilidad.estado.empresa)
const logo = computed(() => empresa.value.logoDataUrl)
const refArchivo = ref<HTMLInputElement | null>(null)
const confirmarQuitar = ref(false)

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
  confirmarQuitar.value = false
  ui.notificar({
    tipo: 'advertencia',
    titulo: 'Logo eliminado',
    mensaje: 'Se volvió al espacio reservado con las iniciales EG.',
  })
}
</script>

<template>
  <section class="page">
    <div class="page__header">
      <div>
        <h2>Configuración</h2>
        <p class="page__lead">
          Identidad de la empresa y espacio reservado para el logotipo. Los datos comerciales
          completos se habilitan en la fase de informes y configuración.
        </p>
      </div>
      <AppBadge tipo="marca" punto>Identidad visual</AppBadge>
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
      descripcion="Información ficticia utilizada por los comprobantes de la demostración."
    >
      <div class="demo-form">
        <AppInput label="Razón social" :model-value="empresa.razonSocial" readonly />
        <AppInput label="Nombre comercial" :model-value="empresa.nombreComercial" readonly />
        <AppInput label="CUIT" :model-value="empresa.cuit" readonly />
        <AppInput label="Actividad" :model-value="empresa.actividad" readonly />
        <AppInput label="Dirección" :model-value="empresa.direccion" readonly />
        <AppInput label="Teléfono" :model-value="empresa.telefono" readonly />
        <AppInput label="Correo electrónico" type="email" :model-value="empresa.email" readonly />
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
  </section>
</template>
