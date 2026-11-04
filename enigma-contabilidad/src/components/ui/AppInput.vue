<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { computed, useId } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    label?: string
    id?: string
    type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number' | 'date'
    placeholder?: string
    hint?: string
    error?: string
    disabled?: boolean
    readonly?: boolean
    required?: boolean
    autocomplete?: string
  }>(),
  {
    modelValue: '',
    type: 'text',
    disabled: false,
    readonly: false,
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [valor: string]
}>()

const idGenerado = useId()
const idCampo = computed(() => props.id ?? `campo-${idGenerado}`)
const idAyuda = computed(() => (props.hint ? `${idCampo.value}-ayuda` : undefined))
const idError = computed(() => (props.error ? `${idCampo.value}-error` : undefined))
const descritoPor = computed(() => [idError.value, idAyuda.value].filter(Boolean).join(' '))

function alEscribir(evento: Event): void {
  emit('update:modelValue', (evento.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="ui-field" :class="{ 'ui-field--error': error }">
    <label v-if="label" class="ui-label" :for="idCampo">
      {{ label }}
      <span v-if="required" class="ui-label__requerido" aria-hidden="true">*</span>
    </label>
    <input
      v-bind="$attrs"
      :id="idCampo"
      class="ui-control"
      :class="{ 'ui-control--error': error }"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :autocomplete="autocomplete"
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
