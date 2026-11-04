<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import AppButton from './AppButton.vue'
import AppModal from './AppModal.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    titulo?: string
    mensaje?: string
    confirmarTexto?: string
    cancelarTexto?: string
    peligro?: boolean
    cargando?: boolean
  }>(),
  {
    titulo: 'Confirmar acción',
    mensaje: 'Esta acción no se puede deshacer.',
    confirmarTexto: 'Confirmar',
    cancelarTexto: 'Cancelar',
    peligro: false,
    cargando: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [abierto: boolean]
  confirmar: []
}>()

function actualizar(abierto: boolean): void {
  emit('update:modelValue', abierto)
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    :titulo="titulo"
    tamano="sm"
    :ocultar-cerrar="true"
    @update:model-value="actualizar"
  >
    <div
      class="ui-confirmacion__icono"
      :class="{ 'ui-confirmacion__icono--peligro': props.peligro }"
      aria-hidden="true"
    >
      <TriangleAlert :size="22" />
    </div>
    <p class="ui-confirmacion__mensaje">{{ mensaje }}</p>
    <template #pie>
      <AppButton
        variante="secundario"
        :disabled="cargando"
        data-autofocus
        @click="actualizar(false)"
      >
        {{ cancelarTexto }}
      </AppButton>
      <AppButton
        :variante="peligro ? 'peligro' : 'primario'"
        :cargando="cargando"
        @click="emit('confirmar')"
      >
        {{ confirmarTexto }}
      </AppButton>
    </template>
  </AppModal>
</template>
