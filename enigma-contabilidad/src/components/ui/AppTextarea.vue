<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    id?: string
    placeholder?: string
    hint?: string
    error?: string
    rows?: number
    disabled?: boolean
    readonly?: boolean
    required?: boolean
  }>(),
  {
    modelValue: '',
    rows: 4,
    disabled: false,
    readonly: false,
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [valor: string]
}>()

const idGenerado = useId()
const idCampo = computed(() => props.id ?? `textarea-${idGenerado}`)
const idAyuda = computed(() => (props.hint ? `${idCampo.value}-ayuda` : undefined))
const idError = computed(() => (props.error ? `${idCampo.value}-error` : undefined))
const descritoPor = computed(() => [idError.value, idAyuda.value].filter(Boolean).join(' '))

function alEscribir(evento: Event): void {
  emit('update:modelValue', (evento.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <div class="ui-field">
    <label v-if="label" class="ui-label" :for="idCampo">
      {{ label }}
      <span v-if="required" class="ui-label__requerido" aria-hidden="true">*</span>
    </label>
    <textarea
      :id="idCampo"
      class="ui-control ui-textarea"
      :class="{ 'ui-control--error': error }"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="descritoPor || undefined"
      @input="alEscribir"
    />
    <p v-if="error" :id="idError" class="ui-field__error">
      <CircleAlert :size="14" aria-hidden="true" />
      {{ error }}
    </p>
    <p v-else-if="hint" :id="idAyuda" class="ui-field__ayuda">{{ hint }}</p>
  </div>
</template>
