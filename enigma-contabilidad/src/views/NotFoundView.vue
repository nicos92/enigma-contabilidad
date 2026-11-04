<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
</script>

<template>
  <section class="page">
    <div class="page__header">
      <div>
        <h2>Página no encontrada</h2>
        <p class="page__lead">
          La dirección solicitada no corresponde a ninguna sección del sistema.
        </p>
      </div>
      <AppBadge tipo="error">Error 404</AppBadge>
    </div>

    <AppCard>
      <EmptyState
        titulo="No pudimos encontrar esa pantalla"
        mensaje="Revisá la dirección o volvé al panel general para continuar con el recorrido."
      >
        <template #acciones>
          <RouterLink class="ui-button ui-button--primario" to="/dashboard">
            Ir al panel general
          </RouterLink>
        </template>
      </EmptyState>
    </AppCard>
  </section>
</template>
