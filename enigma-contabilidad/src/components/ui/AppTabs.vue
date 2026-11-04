<script setup lang="ts">
import { nextTick, ref, useId } from 'vue'
import type { TabItem } from './tipos'

const props = defineProps<{
  tabs: readonly TabItem[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
}>()

const idBase = useId()
const botones = ref<HTMLButtonElement[]>([])

function idTab(tab: TabItem): string {
  return `${idBase}-tab-${tab.id}`
}

function idPanel(tab: TabItem): string {
  return `${idBase}-panel-${tab.id}`
}

function seleccionar(tab: TabItem): void {
  if (!tab.deshabilitada) emit('update:modelValue', tab.id)
}

function registrarBoton(elemento: unknown, indice: number): void {
  if (elemento instanceof HTMLButtonElement) botones.value[indice] = elemento
}

async function moverFoco(desde: number, paso: number): Promise<void> {
  const total = props.tabs.length
  let indice = desde
  for (let intento = 0; intento < total; intento += 1) {
    indice = (indice + paso + total) % total
    const tab = props.tabs[indice]
    if (tab && !tab.deshabilitada) {
      seleccionar(tab)
      await nextTick()
      botones.value[indice]?.focus()
      return
    }
  }
}

function alTeclear(evento: KeyboardEvent, indice: number): void {
  if (evento.key === 'ArrowRight') {
    evento.preventDefault()
    void moverFoco(indice, 1)
  } else if (evento.key === 'ArrowLeft') {
    evento.preventDefault()
    void moverFoco(indice, -1)
  } else if (evento.key === 'Home') {
    evento.preventDefault()
    void moverFoco(-1, 1)
  } else if (evento.key === 'End') {
    evento.preventDefault()
    void moverFoco(props.tabs.length, -1)
  }
}
</script>

<template>
  <div class="ui-tabs">
    <div class="ui-tabs__lista" role="tablist" aria-label="Secciones">
      <button
        v-for="(tab, indice) in tabs"
        :id="idTab(tab)"
        :key="tab.id"
        :ref="(elemento) => registrarBoton(elemento, indice)"
        type="button"
        role="tab"
        class="ui-tabs__tab"
        :aria-selected="modelValue === tab.id"
        :aria-controls="idPanel(tab)"
        :tabindex="modelValue === tab.id ? 0 : -1"
        :disabled="tab.deshabilitada"
        @click="seleccionar(tab)"
        @keydown="alTeclear($event, indice)"
      >
        {{ tab.etiqueta }}
        <span v-if="tab.badge !== undefined" class="ui-tabs__badge">{{ tab.badge }}</span>
      </button>
    </div>
    <div
      v-for="tab in tabs"
      v-show="tab.id === modelValue"
      :id="idPanel(tab)"
      :key="tab.id"
      class="ui-tabs__panel"
      role="tabpanel"
      :aria-labelledby="idTab(tab)"
      tabindex="0"
    >
      <slot :name="`panel-${tab.id}`" />
    </div>
  </div>
</template>
