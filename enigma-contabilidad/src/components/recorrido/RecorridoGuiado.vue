<script setup lang="ts">
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Presentation,
  X,
} from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { useRecorridoStore } from '@/stores/recorrido'
import { useUiStore } from '@/stores/ui'

const recorrido = useRecorridoStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

const pasosAbiertos = ref(false)

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

const completados = computed(() => Math.min(recorrido.numeroPaso - 1, recorrido.total))

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

watch(
  () => recorrido.abierto,
  (abierto) => {
    if (!abierto) pasosAbiertos.value = false
  },
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

function alternarPasos(): void {
  pasosAbiertos.value = !pasosAbiertos.value
}

function seleccionarPaso(numero: number): void {
  recorrido.irAPaso(numero)
  pasosAbiertos.value = false
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
  <div
    v-if="visible && recorrido.pasoActual"
    class="recorrido"
    :class="{ 'recorrido--presentacion': ui.modoPresentacion }"
  >
    <section class="recorrido__panel" role="region" aria-label="Recorrido guiado">
      <header class="recorrido__cabecera">
        <span class="recorrido__icono" aria-hidden="true">
          <Presentation :size="15" />
        </span>
        <div class="recorrido__identidad">
          <span class="recorrido__eyebrow">
            Recorrido guiado
            <span class="recorrido__tipo">{{ etiquetaTipo }}</span>
          </span>
          <strong>Paso {{ recorrido.numeroPaso }} de {{ recorrido.total }}</strong>
        </div>
        <div class="recorrido__cabecera-acciones">
          <button
            type="button"
            class="recorrido__icono-boton"
            :aria-label="
              ui.modoPresentacion ? 'Salir del modo presentación' : 'Activar modo presentación'
            "
            :title="ui.modoPresentacion ? 'Salir de presentación' : 'Modo presentación'"
            @click="alternarPresentacion"
          >
            <Presentation :size="15" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="recorrido__icono-boton"
            aria-label="Cerrar recorrido guiado"
            title="Cerrar recorrido"
            @click="cerrar"
          >
            <X :size="15" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div class="recorrido__progreso" aria-hidden="true">
        <span :style="{ width: `${recorrido.porcentaje}%` }" />
      </div>

      <div class="recorrido__cuerpo">
        <span class="recorrido__departamento">{{ recorrido.pasoActual.departamento }}</span>
        <strong class="recorrido__titulo">{{ recorrido.pasoActual.titulo }}</strong>
        <p class="recorrido__descripcion">{{ recorrido.pasoActual.descripcion }}</p>
      </div>

      <div class="recorrido__pie">
        <button
          type="button"
          class="recorrido__ver-pasos"
          :aria-expanded="pasosAbiertos"
          aria-controls="recorrido-pasos"
          @click="alternarPasos"
        >
          <ListChecks :size="15" aria-hidden="true" />
          {{ pasosAbiertos ? 'Ocultar pasos' : `Ver pasos · ${completados}/${recorrido.total}` }}
          <ChevronDown
            :size="14"
            class="recorrido__chevron"
            :class="{ 'recorrido__chevron--abierto': pasosAbiertos }"
            aria-hidden="true"
          />
        </button>

        <div class="recorrido__navegacion">
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

      <div v-if="pasosAbiertos" id="recorrido-pasos" class="recorrido__desplegable">
        <ol class="recorrido__lista" aria-label="Pasos del recorrido">
          <li v-for="paso in recorrido.pasos" :key="paso.clave">
            <button
              type="button"
              class="recorrido__paso"
              :class="{
                'recorrido__paso--activo': paso.numero === recorrido.numeroPaso,
                'recorrido__paso--hecho': paso.numero < recorrido.numeroPaso,
              }"
              :aria-current="paso.numero === recorrido.numeroPaso ? 'step' : undefined"
              @click="seleccionarPaso(paso.numero)"
            >
              <span class="recorrido__paso-numero" aria-hidden="true">
                <Check v-if="paso.numero < recorrido.numeroPaso" :size="11" :stroke-width="3" />
                <template v-else>{{ paso.numero }}</template>
              </span>
              <span class="recorrido__paso-texto">
                <strong>{{ paso.titulo }}</strong>
                <small>{{ paso.departamento }}</small>
              </span>
              <ChevronRight :size="14" class="recorrido__paso-flecha" aria-hidden="true" />
            </button>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>

<style scoped>
.recorrido {
  position: fixed;
  right: var(--espacio-5);
  bottom: var(--espacio-5);
  z-index: calc(var(--capa-modal) - 1);
  width: min(380px, calc(100vw - 2 * var(--espacio-5)));
  pointer-events: none;
}

.recorrido--presentacion {
  width: min(420px, calc(100vw - 2 * var(--espacio-5)));
}

.recorrido__panel {
  display: flex;
  overflow: hidden;
  max-height: calc(100vh - 2 * var(--espacio-5));
  flex-direction: column;
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
  padding: var(--espacio-3) var(--espacio-3) var(--espacio-2);
}

.recorrido__icono {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radio-sm);
  background: var(--color-primario-suave);
  color: var(--color-primario);
}

.recorrido__identidad {
  min-width: 0;
  flex: 1;
}

.recorrido__eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-texto-tenue);
  font-size: 10px;
  font-weight: var(--peso-semi);
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-transform: uppercase;
}

.recorrido__tipo {
  padding: 1px 6px;
  border-radius: var(--radio-completo);
  background: var(--color-fondo-alterno);
  color: var(--color-texto-suave);
  font-size: 9px;
  letter-spacing: 0.02em;
}

.recorrido__identidad strong {
  display: block;
  margin-top: 1px;
  color: var(--color-texto);
  font-size: var(--texto-sm);
  font-weight: var(--peso-semi);
}

.recorrido__cabecera-acciones {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
}

.recorrido__icono-boton {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: var(--radio-sm);
  color: var(--color-texto-tenue);
}

.recorrido__icono-boton:hover {
  background: var(--color-fondo-alterno);
  color: var(--color-texto);
}

.recorrido__progreso {
  height: 3px;
  flex: 0 0 auto;
  background: var(--color-borde-suave);
}

.recorrido__progreso span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--color-primario), #7ba2ff);
  transition: width var(--transicion-base);
}

.recorrido__cuerpo {
  padding: var(--espacio-3) var(--espacio-4);
}

.recorrido__departamento {
  display: block;
  overflow: hidden;
  color: var(--color-texto-tenue);
  font-size: 10px;
  font-weight: var(--peso-semi);
  letter-spacing: 0.04em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.recorrido__titulo {
  display: block;
  margin-top: 2px;
  color: var(--color-texto);
  font-size: var(--texto-base);
  font-weight: var(--peso-semi);
  line-height: 1.3;
}

.recorrido__descripcion {
  margin-top: 3px;
  color: var(--color-texto-suave);
  font-size: var(--texto-xs);
  line-height: 1.45;
}

.recorrido__pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--espacio-2);
  padding: var(--espacio-2) var(--espacio-3);
  border-top: 1px solid var(--color-borde-suave);
  background: var(--color-superficie-suave);
}

.recorrido__ver-pasos {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border-radius: var(--radio-sm);
  color: var(--color-texto-suave);
  font-size: 11px;
  font-weight: var(--peso-medio);
  white-space: nowrap;
}

.recorrido__ver-pasos:hover {
  background: var(--color-fondo-alterno);
  color: var(--color-texto);
}

.recorrido__chevron {
  transition: transform var(--transicion-rapida);
}

.recorrido__chevron--abierto {
  transform: rotate(180deg);
}

.recorrido__navegacion {
  display: flex;
  align-items: center;
  gap: var(--espacio-2);
}

.recorrido__desplegable {
  min-height: 0;
  overflow-y: auto;
  flex: 1 1 auto;
  padding: var(--espacio-2);
  border-top: 1px solid var(--color-borde-suave);
  background: var(--color-superficie);
}

.recorrido__lista {
  display: grid;
  gap: 2px;
}

.recorrido__paso {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--espacio-2);
  padding: 6px var(--espacio-2);
  border-radius: var(--radio-sm);
  text-align: left;
}

.recorrido__paso:hover {
  background: var(--color-superficie-suave);
}

.recorrido__paso--activo {
  background: var(--color-primario-suave);
}

.recorrido__paso-numero {
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
}

.recorrido__paso--hecho .recorrido__paso-numero {
  border-color: var(--color-exito-borde);
  background: var(--color-exito-suave);
  color: var(--color-exito);
}

.recorrido__paso--activo .recorrido__paso-numero {
  border-color: var(--color-primario);
  background: var(--color-primario);
  color: #fff;
}

.recorrido__paso-texto {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.recorrido__paso-texto strong {
  overflow: hidden;
  color: var(--color-texto);
  font-size: var(--texto-xs);
  font-weight: var(--peso-medio);
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recorrido__paso-texto small {
  overflow: hidden;
  color: var(--color-texto-tenue);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recorrido__paso-flecha {
  flex: 0 0 auto;
  color: var(--color-texto-tenue);
  opacity: 0;
  transition: opacity var(--transicion-rapida);
}

.recorrido__paso:hover .recorrido__paso-flecha,
.recorrido__paso--activo .recorrido__paso-flecha {
  opacity: 1;
}

@media (max-width: 720px) {
  .recorrido {
    right: var(--espacio-3);
    bottom: var(--espacio-3);
    left: var(--espacio-3);
    width: auto;
  }

  .recorrido__panel {
    width: 100%;
  }

  .recorrido__pie {
    align-items: stretch;
    flex-direction: column;
  }

  .recorrido__navegacion {
    width: 100%;
  }

  .recorrido__navegacion :deep(.ui-button) {
    flex: 1;
    justify-content: center;
  }
}
</style>
