<script setup lang="ts">
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { computed, onMounted, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import type { SemanaIngresoEgreso } from '@/core/dashboard'
import { formatearMoneda } from '@/core/dinero'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps<{
  semanas: readonly SemanaIngresoEgreso[]
}>()

const soportaCanvas = ref(false)

const totalIngresos = computed(() =>
  props.semanas.reduce((total, semana) => total + semana.ingresos, 0),
)
const totalEgresos = computed(() =>
  props.semanas.reduce((total, semana) => total + semana.egresos, 0),
)

const descripcionAccesible = computed(
  () =>
    `Gráfico de ingresos y egresos por semana. Ingresos: ${formatearMoneda(totalIngresos.value)}. Egresos: ${formatearMoneda(totalEgresos.value)}.`,
)

const datos = computed<ChartData<'bar'>>(() => ({
  labels: props.semanas.map((semana) => semana.etiqueta),
  datasets: [
    {
      label: 'Ingresos',
      data: props.semanas.map((semana) => semana.ingresos),
      backgroundColor: 'rgba(47, 104, 224, 0.82)',
      hoverBackgroundColor: '#2456d6',
      borderRadius: 5,
      maxBarThickness: 28,
    },
    {
      label: 'Egresos',
      data: props.semanas.map((semana) => semana.egresos),
      backgroundColor: 'rgba(163, 34, 34, 0.72)',
      hoverBackgroundColor: '#a32222',
      borderRadius: 5,
      maxBarThickness: 28,
    },
  ],
}))

const formatoCompacto = new Intl.NumberFormat('es-AR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function formatearEje(valor: string | number): string {
  return `$ ${formatoCompacto.format(Number(valor))}`
}

const opciones = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        boxWidth: 8,
        boxHeight: 8,
        color: '#5a667b',
        font: { family: 'Inter', size: 12 },
      },
    },
    tooltip: {
      callbacks: {
        label: (contexto) =>
          `${contexto.dataset.label ?? 'Importe'}: ${formatearMoneda(Number(contexto.raw))}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#5a667b', font: { family: 'Inter', size: 11 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: '#ebeff6' },
      ticks: {
        color: '#5a667b',
        font: { family: 'Inter', size: 11 },
        callback: (valor) => formatearEje(valor),
      },
    },
  },
}))

onMounted(() => {
  try {
    const lienzo = document.createElement('canvas')
    soportaCanvas.value = Boolean(lienzo.getContext('2d'))
  } catch {
    soportaCanvas.value = false
  }
})
</script>

<template>
  <div class="dashboard-chart" role="img" :aria-label="descripcionAccesible">
    <Bar
      v-if="soportaCanvas"
      :data="datos"
      :options="opciones"
      :aria-label="descripcionAccesible"
    />
    <table v-else class="dashboard-chart__alternativa">
      <caption class="sr-only">
        {{
          descripcionAccesible
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">Semana</th>
          <th scope="col">Ingresos</th>
          <th scope="col">Egresos</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="semana in semanas" :key="semana.clave">
          <th scope="row">{{ semana.etiqueta }}</th>
          <td>{{ formatearMoneda(semana.ingresos) }}</td>
          <td>{{ formatearMoneda(semana.egresos) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
