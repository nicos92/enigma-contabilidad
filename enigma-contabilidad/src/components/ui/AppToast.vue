<script setup lang="ts">
import { CircleCheck, CircleX, Info, TriangleAlert, X } from '@lucide/vue'
import { onBeforeUnmount, onMounted } from 'vue'
import type { Notificacion } from '@/stores/ui'

const props = defineProps<{
  notificacion: Notificacion
}>()

const emit = defineEmits<{
  cerrar: [id: number]
}>()

const iconos = {
  exito: CircleCheck,
  error: CircleX,
  advertencia: TriangleAlert,
  info: Info,
}

let temporizador: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  if (props.notificacion.duracion > 0) {
    temporizador = setTimeout(
      () => emit('cerrar', props.notificacion.id),
      props.notificacion.duracion,
    )
  }
})

onBeforeUnmount(() => {
  if (temporizador) clearTimeout(temporizador)
})
</script>

<template>
  <div
    class="ui-toast"
    :class="`ui-toast--${notificacion.tipo}`"
    :role="notificacion.tipo === 'error' ? 'alert' : 'status'"
  >
    <span class="ui-toast__icono" aria-hidden="true">
      <component :is="iconos[notificacion.tipo]" :size="17" />
    </span>
    <div class="ui-toast__texto">
      <strong>{{ notificacion.titulo }}</strong>
      <span v-if="notificacion.mensaje">{{ notificacion.mensaje }}</span>
    </div>
    <button
      type="button"
      class="ui-toast__cerrar"
      aria-label="Cerrar notificación"
      @click="emit('cerrar', notificacion.id)"
    >
      <X :size="15" aria-hidden="true" />
    </button>
  </div>
</template>
