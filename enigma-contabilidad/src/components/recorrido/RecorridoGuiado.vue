<script setup lang="ts">
import { Check, ChevronLeft, ChevronRight, ListChecks, Presentation, X } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import type { TipoBadge } from '@/components/ui/tipos'
import { useRecorridoStore } from '@/stores/recorrido'
import { useUiStore } from '@/stores/ui'

const recorrido = useRecorridoStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

const visible = computed(() => recorrido.abierto && Boolean(recorrido.pasoActual))

const etiquetaTipo = computed(() => {
  switch (recorrido.pasoActual?.tipoOperacion) {
    case 'compra':
      return 'Compra'
    case 'venta':
      return 'Venta'
    default:
      return 'General'
  }
})

const tipoBadge = computed<TipoBadge>(() => {
  switch (recorrido.pasoActual?.tipoOperacion) {
    case 'compra':
      return 'info'
    case 'venta':
      return 'exito'
    default:
      return 'neutral'
  }
})

async function sincronizarPantalla(): Promise<void> {
  if (!recorrido.abierto) return
  const paso = recorrido.pasoActual
  if (!paso) return

  const destino = router.resolve(paso.destino)
  if (route.fullPath === destino.fullPath) return

  await router.push(paso.destino)
}

watch(
  () => [recorrido.abierto, recorrido.numeroPaso, recorrido.pasos] as const,
  () => {
    void sincronizarPantalla()
  },
  { immediate: true },
)

function cerrar(): void {
  recorrido.cerrar()
  ui.desactivarModoPresentacion()
}

function finalizar(): void {
  cerrar()
}

function alternarPresentacion(): void {
  ui.alternarModoPresentacion()
}

function alTeclear(evento: KeyboardEvent): void {
  if (!recorrido.abierto) return

  const destino = evento.target
  const enCampo =
    destino instanceof HTMLElement &&
    (destino.tagName === 'INPUT' ||
      destino.tagName === 'TEXTAREA' ||
      destino.tagName === 'SELECT' ||
      destino.isContentEditable)

  if (enCampo) return

  if (evento.key === 'Escape') {
    evento.preventDefault()
    cerrar()
  } else if (evento.key === 'ArrowRight') {
    evento.preventDefault()
    recorrido.siguiente()
  } else if (evento.key === 'ArrowLeft') {
    evento.preventDefault()
    recorrido.anterior()
  }
}

onMounted(() => window.addEventListener('keydown', alTeclear))
onBeforeUnmount(() => window.removeEventListener('keydown', alTeclear))
</script>

<template>
  <div v-if="visible && recorrido.pasoActual" class="recorrido">
    <div class="recorrido__barra">
      <div class="recorrido__cabecera">
        <span class="recorrido__icono" aria-hidden="true">
          <Presentation :size="16" />
        </span>
        <span class="recorrido__contador"
          >Paso {{ recorrido.numeroPaso }} de {{ recorrido.total }}</span
        >
        <AppBadge :tipo="tipoBadge">{{ etiquetaTipo }}</AppBadge>
        <span class="recorrido__departamento">{{ recorrido.pasoActual.departamento }}</span>

        <button
          type="button"
          class="recorrido__cerrar"
          aria-label="Cerrar recorrido guiado"
          @click="cerrar"
        >
          <X :size="16" aria-hidden="true" />
        </button>
      </div>

      <div class="recorrido__cuerpo">
        <div class="recorrido__texto">
          <strong>{{ recorrido.pasoActual.titulo }}</strong>
          <p>{{ recorrido.pasoActual.descripcion }}</p>
        </div>

        <div class="recorrido__acciones">
          <AppButton variante="fantasma" tamano="sm" @click="alternarPresentacion">
            <Presentation :size="15" aria-hidden="true" />
            {{ ui.modoPresentacion ? 'Salir de presentación' : 'Modo presentación' }}
          </AppButton>
          <AppButton
            variante="secundario"
            tamano="sm"
            :disabled="recorrido.esPrimerPaso"
            @click="recorrido.anterior"
          >
            <ChevronLeft :size="15" aria-hidden="true" />
            Anterior
          </AppButton>
          <AppButton v-if="!recorrido.esUltimoPaso" tamano="sm" @click="recorrido.siguiente">
            Siguiente
            <ChevronRight :size="15" aria-hidden="true" />
          </AppButton>
          <AppButton v-else variante="exito" tamano="sm" @click="finalizar">
            <ListChecks :size="15" aria-hidden="true" />
            Finalizar
          </AppButton>
        </div>
      </div>

      <ol class="recorrido__pasos" aria-label="Pasos del recorrido">
        <li v-for="paso in recorrido.pasos" :key="paso.clave">
          <button
            type="button"
            class="recorrido__punto"
            :class="{ 'recorrido__punto--activo': paso.numero === recorrido.numeroPaso }"
            :aria-label="`Ir al paso ${paso.numero}: ${paso.titulo}`"
            :aria-current="paso.numero === recorrido.numeroPaso ? 'step' : undefined"
            :title="`${paso.numero}. ${paso.titulo}`"
            @click="recorrido.irAPaso(paso.numero)"
          >
            <Check
              v-if="paso.numero < recorrido.numeroPaso"
              :size="10"
              :stroke-width="3"
              aria-hidden="true"
            />
            <template v-else>{{ paso.numero }}</template>
          </button>
        </li>
      </ol>

      <div class="recorrido__progreso" aria-hidden="true">
        <span :style="{ width: `${recorrido.porcentaje}%` }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.recorrido {
  position: fixed;
  right: var(--espacio-5);
  bottom: var(--espacio-5);
  left: var(--espacio-5);
  z-index: calc(var(--capa-modal) - 1);
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.recorrido__barra {
  position: relative;
  width: min(980px, 100%);
  overflow: hidden;
  border: 1px solid var(--color-borde-fuerte);
  border-radius: var(--radio-lg);
  background: var(--color-superficie);
  box-shadow: var(--sombra-lg);
  pointer-events: auto;
}

.recorrido__cabecera {
  display: flex;
  align-items: center;
  gap: var(--espacio-2);
  padding: var(--espacio-2) var(--espacio-4);
  border-bottom: 1px solid var(--color-borde-suave);
  background: var(--color-superficie-suave);
}

.recorrido__icono {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radio-sm);
  background: var(--color-primario-suave);
  color: var(--color-primario);
}

.recorrido__contador {
  color: var(--color-texto);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
}

.recorrido__departamento {
  overflow: hidden;
  color: var(--color-texto-tenue);
  font-size: var(--texto-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recorrido__cerrar {
  display: grid;
  width: 28px;
  height: 28px;
  margin-left: auto;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radio-sm);
  color: var(--color-texto-tenue);
}

.recorrido__cerrar:hover {
  background: var(--color-fondo-alterno);
  color: var(--color-texto);
}

.recorrido__cuerpo {
  display: flex;
  align-items: center;
  gap: var(--espacio-5);
  padding: var(--espacio-4);
}

.recorrido__texto {
  min-width: 0;
  flex: 1;
}

.recorrido__texto strong {
  display: block;
  color: var(--color-texto);
  font-size: var(--texto-lg);
  font-weight: var(--peso-semi);
}

.recorrido__texto p {
  margin-top: 2px;
  color: var(--color-texto-suave);
  font-size: var(--texto-sm);
}

.recorrido__acciones {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--espacio-2);
}

.recorrido__pasos {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 var(--espacio-4) var(--espacio-3);
  overflow-x: auto;
  scrollbar-width: none;
}

.recorrido__pasos::-webkit-scrollbar {
  display: none;
}

.recorrido__punto {
  display: grid;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-completo);
  background: var(--color-superficie);
  color: var(--color-texto-tenue);
  font-size: 9px;
  font-weight: var(--peso-semi);
  transition:
    background-color var(--transicion-rapida),
    border-color var(--transicion-rapida),
    color var(--transicion-rapida);
}

.recorrido__punto:hover {
  border-color: var(--color-primario-borde);
  color: var(--color-primario);
}

.recorrido__punto--activo {
  border-color: var(--color-primario);
  background: var(--color-primario);
  color: #fff;
  box-shadow: var(--sombra-foco);
}

.recorrido__progreso {
  height: 3px;
  background: var(--color-borde-suave);
}

.recorrido__progreso span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--color-primario), #7ba2ff);
  transition: width var(--transicion-base);
}

@media (max-width: 720px) {
  .recorrido {
    right: var(--espacio-3);
    bottom: var(--espacio-3);
    left: var(--espacio-3);
  }

  .recorrido__cuerpo {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--espacio-3);
  }

  .recorrido__acciones {
    width: 100%;
    justify-content: flex-start;
  }

  .recorrido__departamento {
    display: none;
  }
}
</style>
