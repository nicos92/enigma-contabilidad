<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

defineProps<{
  titulo: string
  descripcion: string
}>()

const route = useRoute()

const vista = computed(() => (typeof route.query.vista === 'string' ? route.query.vista : null))
</script>

<template>
  <section class="page">
    <div class="page__header">
      <div>
        <h2>{{ titulo }}</h2>
        <p class="page__lead">
          {{ descripcion }}
          <template v-if="vista">
            Sección solicitada: <strong>{{ vista }}</strong
            >.</template
          >
        </p>
      </div>
      <AppBadge tipo="advertencia" punto>Módulo en preparación</AppBadge>
    </div>

    <AppCard>
      <EmptyState
        titulo="Esta sección se habilita en una próxima fase"
        mensaje="La ruta, el submenú y el estado activo ya forman parte del shell. La navegación por hash funciona sin recargar la página."
      >
        <template #icono>
          <span aria-hidden="true">EG</span>
        </template>
      </EmptyState>
    </AppCard>
  </section>
</template>
