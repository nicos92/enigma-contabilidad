<script setup lang="ts">
const estadoProyecto = [
  {
    titulo: 'Aplicación base',
    estado: 'Listo',
    detalle: 'Vite 8, Vue 3, TypeScript estricto, router y Pinia configurados.',
  },
  {
    titulo: 'Datos y motor contable',
    estado: 'Fase 2',
    detalle: 'Plan de cuentas, datos demo y derivación de libros y balances.',
  },
  {
    titulo: 'Experiencia visual',
    estado: 'Fases 3 y 4',
    detalle: 'Design system, layout definitivo y dashboard con indicadores.',
  },
  {
    titulo: 'Circuito operativo',
    estado: 'Fases 5 a 13',
    detalle: 'Compras, ventas, tesorería, contaduría, libros, balances e informes.',
  },
]
</script>

<template>
  <section class="page">
    <div class="page__header">
      <div>
        <h2>Bienvenido a Enigma Gestión</h2>
        <p class="page__lead">
          Base del prototipo de gestión contable para Enigma Solutions. La aplicación ya arranca,
          compila y ejecuta sus pruebas de humo.
        </p>
      </div>
      <span class="badge badge--exito">Scaffold verificado</span>
    </div>

    <div class="card-grid">
      <article v-for="item in estadoProyecto" :key="item.titulo" class="card">
        <header class="card__header">
          <h3>{{ item.titulo }}</h3>
          <span class="badge">{{ item.estado }}</span>
        </header>
        <p>{{ item.detalle }}</p>
      </article>
    </div>

    <section class="card">
      <h3>Stack del proyecto</h3>
      <ul class="chip-list">
        <li class="chip">Vue 3.5</li>
        <li class="chip">TypeScript 6</li>
        <li class="chip">Vite 8</li>
        <li class="chip">Vue Router 5</li>
        <li class="chip">Pinia 4</li>
        <li class="chip">Chart.js 4</li>
        <li class="chip">Vitest 5</li>
        <li class="chip">Inter</li>
      </ul>
    </section>
  </section>
</template>
