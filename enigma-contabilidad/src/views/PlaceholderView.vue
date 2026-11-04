<script setup lang="ts">
defineProps<{
  titulo: string
  descripcion: string
}>()
</script>

<template>
  <section class="page">
    <div class="page__header">
      <div>
        <h2>{{ titulo }}</h2>
        <p class="page__lead">{{ descripcion }}</p>
      </div>
      <span class="badge badge--advertencia">Módulo en preparación</span>
    </div>

    <div class="card card--vacia">
      <p>
        Esta sección se habilita en una próxima fase del plan de desarrollo. La ruta ya forma parte
        del prototipo y la navegación por hash funciona sin recargar la página.
      </p>
    </div>
  </section>
</template>
