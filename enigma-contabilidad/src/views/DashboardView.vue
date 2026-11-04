<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'

const estadoProyecto = [
  {
    titulo: 'Aplicación base',
    estado: 'Listo',
    tipo: 'exito' as const,
    detalle: 'Vite 8, Vue 3, TypeScript estricto, router y Pinia configurados.',
  },
  {
    titulo: 'Datos y motor contable',
    estado: 'Verificado',
    tipo: 'exito' as const,
    detalle: 'Plan de cuentas, datos demo y derivación de libros y balances.',
  },
  {
    titulo: 'Sistema visual',
    estado: 'Fase 3',
    tipo: 'marca' as const,
    detalle: 'Tokens, layout responsive, componentes reutilizables y UI kit.',
  },
  {
    titulo: 'Circuito operativo',
    estado: 'Próximas fases',
    tipo: 'advertencia' as const,
    detalle: 'Compras, ventas, tesorería, contaduría, libros, balances e informes.',
  },
]

const stack = ['Vue 3.5', 'TypeScript 6', 'Vite 8', 'Vue Router 5', 'Pinia 4', 'Chart.js 4']
</script>

<template>
  <section class="page">
    <div class="page__header">
      <div>
        <h2>Bienvenido a Enigma Gestión</h2>
        <p class="page__lead">
          Prototipo de gestión contable para Enigma Solutions. El shell, los datos de demostración y
          el motor contable ya están preparados para recorrer el circuito completo de una operación.
        </p>
      </div>
      <div class="page__actions">
        <AppBadge tipo="exito" punto>Motor contable verificado</AppBadge>
        <RouterLink class="ui-button ui-button--secundario ui-button--sm" to="/ui-kit">
          Revisar UI Kit
        </RouterLink>
      </div>
    </div>

    <div class="demo-grid">
      <AppCard v-for="item in estadoProyecto" :key="item.titulo" :titulo="item.titulo" interactiva>
        <template #acciones>
          <AppBadge :tipo="item.tipo">{{ item.estado }}</AppBadge>
        </template>
        <p class="texto-suave">{{ item.detalle }}</p>
      </AppCard>
    </div>

    <AppCard
      titulo="Stack del proyecto"
      descripcion="Tecnologías fijadas y verificadas en las fases 0 y 1."
    >
      <ul class="demo-row" aria-label="Tecnologías del proyecto">
        <li v-for="tecnologia in stack" :key="tecnologia" class="ui-chip">{{ tecnologia }}</li>
      </ul>
    </AppCard>
  </section>
</template>
