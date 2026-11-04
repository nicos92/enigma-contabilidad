<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import type { CuentaArbol } from '@/types/contabilidad'
import type { TipoBadge } from '@/components/ui/tipos'

defineProps<{
  cuenta: CuentaArbol
  nivel: number
}>()

function tipoBadge(tipo: CuentaArbol['tipo']): TipoBadge {
  switch (tipo) {
    case 'activo':
      return 'info'
    case 'pasivo':
      return 'advertencia'
    case 'patrimonio':
      return 'marca'
    case 'ingreso':
      return 'exito'
    case 'gasto':
      return 'error'
    default:
      return 'neutral'
  }
}
</script>

<template>
  <li class="plan-nodo" :style="{ paddingLeft: `${nivel * 16}px` }">
    <div class="plan-nodo__linea">
      <span class="plan-nodo__codigo">{{ cuenta.codigo }}</span>
      <span class="plan-nodo__nombre">{{ cuenta.nombre }}</span>
      <AppBadge :tipo="tipoBadge(cuenta.tipo)">{{ cuenta.tipo }}</AppBadge>
      <span class="plan-nodo__naturaleza texto-suave">{{ cuenta.naturaleza }}</span>
      <span v-if="!cuenta.imputable" class="texto-suave"> (grupo)</span>
    </div>
    <ul v-if="cuenta.hijos.length" class="plan-nodo__hijos">
      <PlanCuentasNodo
        v-for="hijo in cuenta.hijos"
        :key="hijo.codigo"
        :cuenta="hijo"
        :nivel="nivel + 1"
      />
    </ul>
  </li>
</template>

<style scoped>
.plan-nodo__linea {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.25rem 0;
}

.plan-nodo__codigo {
  font-weight: 600;
  min-width: 72px;
}

.plan-nodo__nombre {
  flex: 1;
}

.plan-nodo__hijos {
  list-style: none;
  padding: 0;
  margin: 0;
}

.texto-suave {
  color: var(--color-texto-suave, #64748b);
}
</style>
