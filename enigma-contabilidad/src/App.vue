<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import RecorridoGuiado from '@/components/recorrido/RecorridoGuiado.vue'
import ToastStack from '@/components/ui/ToastStack.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const main = ref<HTMLElement | null>(null)

const clasesShell = computed(() => ({
  'app-shell--colapsada': ui.sidebarColapsada,
  'app-shell--menu-abierto': ui.sidebarMovilAbierta,
  'app-shell--presentacion': ui.modoPresentacion,
}))

function enfocarContenido(): void {
  main.value?.focus()
}
</script>

<template>
  <a class="skip-link" href="#contenido-principal" @click.prevent="enfocarContenido">
    Saltar al contenido
  </a>

  <div class="app-shell" :class="clasesShell">
    <AppSidebar />

    <div class="app-overlay" aria-hidden="true" @click="ui.cerrarMenuMovil" />

    <div class="app-body">
      <AppTopbar />

      <main id="contenido-principal" ref="main" class="app-main" tabindex="-1">
        <div class="app-main__contenedor">
          <RouterView />
        </div>
      </main>
    </div>

    <ToastStack />
    <RecorridoGuiado />
  </div>
</template>
