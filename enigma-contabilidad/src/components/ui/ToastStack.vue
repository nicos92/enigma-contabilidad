<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import AppToast from './AppToast.vue'

const ui = useUiStore()
const { notificaciones } = storeToRefs(ui)
</script>

<template>
  <TransitionGroup
    name="toast"
    tag="div"
    class="toast-stack"
    aria-live="polite"
    aria-atomic="false"
  >
    <AppToast
      v-for="notificacion in notificaciones"
      :key="notificacion.id"
      :notificacion="notificacion"
      @cerrar="ui.cerrarNotificacion"
    />
  </TransitionGroup>
</template>
