<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { computed, useId } from 'vue'
import type { OpcionSelect } from './tipos'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    label?: string
    id?: string
    opciones: readonly OpcionSelect[]
    placeholder?: string
    hint?: string
    error?: string
    disabled?: boolean
    required?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: '',
    disabled: false,
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [valor: string]
}>()

const idGenerado = useId()
const idCampo = computed(() => props.id ?? `select-${idGenerado}`)
const idAyuda = computed(() => (props.hint ? `${idCampo.value}-ayuda` : undefined))
const idError = computed(() => (props.error ? `${idCampo.value}-error` : undefined))
const descritoPor = computed(() => [idError.value, idAyuda.value].filter(Boolean).join(' '))

function alCambiar(evento: Event): void {
  emit('update:modelValue', (evento.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="ui-field">
    <label v-if="label" class="ui-label" :for="idCampo">
      {{ label }}
      <span v-if="required" class="ui-label__requerido" aria-hidden="true">*</span>
    </label>
    <select
      :id="idCampo"
      class="ui-control ui-select"
      :class="{ 'ui-control--error': error }"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="descritoPor || undefined"
      @change="alCambiar"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option
        v-for="opcion in opciones"
        :key="opcion.valor"
        :value="opcion.valor"
        :disabled="opcion.deshabilitada"
      >
        {{ opcion.etiqueta }}
      </option>
    </select>
    <p v-if="error" :id="idError" class="ui-field__error">
      <CircleAlert :size="14" aria-hidden="true" />
      {{ error }}
    </p>
    <p v-else-if="hint" :id="idAyuda" class="ui-field__ayuda">{{ hint }}</p>
  </div>
</template>
