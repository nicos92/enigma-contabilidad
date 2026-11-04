<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    titulo: string
    descripcion?: string
    tamano?: 'sm' | 'md' | 'lg' | 'xl'
    cerrarAlHacerClicFuera?: boolean
    ocultarCerrar?: boolean
  }>(),
  {
    tamano: 'md',
    cerrarAlHacerClicFuera: true,
    ocultarCerrar: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [abierto: boolean]
  cerrar: []
}>()

const idGenerado = useId()
const idTitulo = `modal-titulo-${idGenerado}`
const idDescripcion = `modal-descripcion-${idGenerado}`
const dialogo = ref<HTMLElement | null>(null)
let elementoPrevio: HTMLElement | null = null

const clasesDialogo = computed(() => ['ui-modal', `ui-modal--${props.tamano}`])

function cerrar(): void {
  emit('update:modelValue', false)
  emit('cerrar')
}

function enfocarPrimero(): void {
  const contenedor = dialogo.value
  if (!contenedor) return
  const focoPreferido = contenedor.querySelector<HTMLElement>('[data-autofocus]')
  if (focoPreferido) {
    focoPreferido.focus()
    return
  }
  const enfocables = contenedor.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  const primero = enfocables.item(0)
  if (primero) {
    primero.focus()
  } else {
    contenedor.focus()
  }
}

function manejarTeclado(evento: KeyboardEvent): void {
  if (!props.modelValue) return

  if (evento.key === 'Escape') {
    evento.stopPropagation()
    cerrar()
    return
  }

  if (evento.key !== 'Tab' || !dialogo.value) return

  const enfocables = Array.from(
    dialogo.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((elemento) => elemento.offsetParent !== null || elemento === document.activeElement)

  if (enfocables.length === 0) {
    evento.preventDefault()
    dialogo.value.focus()
    return
  }

  const primero = enfocables[0]
  const ultimo = enfocables[enfocables.length - 1]
  if (!primero || !ultimo) return

  if (evento.shiftKey && document.activeElement === primero) {
    evento.preventDefault()
    ultimo.focus()
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault()
    primero.focus()
  }
}

watch(
  () => props.modelValue,
  async (abierto) => {
    if (abierto) {
      elementoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.body.classList.add('sin-scroll')
      await nextTick()
      enfocarPrimero()
    } else {
      document.body.classList.remove('sin-scroll')
      if (elementoPrevio?.isConnected) elementoPrevio.focus()
    }
  },
  { immediate: true },
)

onMounted(() => document.addEventListener('keydown', manejarTeclado))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', manejarTeclado)
  document.body.classList.remove('sin-scroll')
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="ui-modal-overlay"
        @click.self="cerrarAlHacerClicFuera && cerrar()"
      >
        <section
          ref="dialogo"
          :class="clasesDialogo"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="idTitulo"
          :aria-describedby="descripcion ? idDescripcion : undefined"
          tabindex="-1"
        >
          <header class="ui-modal__cabecera">
            <div>
              <h2 :id="idTitulo" class="ui-modal__titulo">{{ titulo }}</h2>
              <p v-if="descripcion" :id="idDescripcion" class="ui-modal__descripcion">
                {{ descripcion }}
              </p>
            </div>
            <button
              v-if="!ocultarCerrar"
              type="button"
              class="ui-modal__cerrar"
              aria-label="Cerrar ventana"
              @click="cerrar"
            >
              <X :size="18" aria-hidden="true" />
            </button>
          </header>
          <div class="ui-modal__cuerpo">
            <slot />
          </div>
          <footer v-if="$slots.pie" class="ui-modal__pie">
            <slot name="pie" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
