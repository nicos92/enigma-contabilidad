<script setup lang="ts">
import { Check, CircleAlert } from '@lucide/vue'
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    label: string
    descripcion?: string
    error?: string
    disabled?: boolean
    id?: string
  }>(),
  {
    modelValue: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [valor: boolean]
}>()

const idGenerado = useId()
const idCampo = computed(() => props.id ?? `checkbox-${idGenerado}`)
const idAyuda = computed(() => (props.descripcion ? `${idCampo.value}-ayuda` : undefined))
const idError = computed(() => (props.error ? `${idCampo.value}-error` : undefined))
const descritoPor = computed(() => [idError.value, idAyuda.value].filter(Boolean).join(' '))

function alCambiar(evento: Event): void {
  emit('update:modelValue', (evento.target as HTMLInputElement).checked)
}
</script>

<template>
  <div class="ui-field">
    <label class="ui-checkbox" :class="{ 'ui-checkbox--deshabilitado': disabled }" :for="idCampo">
      <input
        :id="idCampo"
        class="ui-checkbox__input"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="descritoPor || undefined"
        @change="alCambiar"
      />
      <span class="ui-checkbox__control" aria-hidden="true">
        <Check v-if="modelValue" :size="13" :stroke-width="3" />
      </span>
      <span class="ui-checkbox__texto">
        <strong>{{ label }}</strong>
        <small v-if="descripcion" :id="idAyuda">{{ descripcion }}</small>
      </span>
    </label>
    <p v-if="error" :id="idError" class="ui-field__error">
      <CircleAlert :size="14" aria-hidden="true" />
      {{ error }}
    </p>
  </div>
</template>
