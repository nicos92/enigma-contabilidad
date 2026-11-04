<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { computed, ref, useId, watch } from 'vue'
import { formatearImporte } from '@/core/dinero'

const props = withDefaults(
  defineProps<{
    modelValue: number
    label?: string
    id?: string
    placeholder?: string
    hint?: string
    error?: string
    disabled?: boolean
    required?: boolean
  }>(),
  {
    modelValue: 0,
    disabled: false,
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [centavos: number]
}>()

const idGenerado = useId()
const idCampo = computed(() => props.id ?? `moneda-${idGenerado}`)
const idAyuda = computed(() => (props.hint ? `${idCampo.value}-ayuda` : undefined))
const idError = computed(() => (props.error ? `${idCampo.value}-error` : undefined))
const descritoPor = computed(() => [idError.value, idAyuda.value].filter(Boolean).join(' '))

const enfocado = ref(false)
const texto = ref(formatearImporte(props.modelValue))

watch(
  () => props.modelValue,
  (valor) => {
    if (!enfocado.value) texto.value = formatearImporte(valor)
  },
)

/**
 * Interpreta importes escritos en formato argentino. Acepta coma decimal,
 * puntos de miles o un punto decimal simple cuando no hay coma.
 */
function parsearImporte(valor: string): number | null {
  const limpio = valor.replace(/[^\d.,]/g, '')
  if (!limpio) return null

  let normalizado = limpio
  if (limpio.includes(',')) {
    normalizado = limpio.replace(/\./g, '').replace(',', '.')
  } else if (limpio.includes('.')) {
    const partes = limpio.split('.')
    const ultima = partes[partes.length - 1] ?? ''
    if (partes.length > 1 && ultima.length === 3) {
      normalizado = limpio.replace(/\./g, '')
    }
  }

  const numero = Number(normalizado)
  if (!Number.isFinite(numero)) return null
  return Math.round(numero * 100)
}

function alEnfocar(evento: FocusEvent): void {
  enfocado.value = true
  const input = evento.target as HTMLInputElement
  input.select()
}

function alEscribir(evento: Event): void {
  const input = evento.target as HTMLInputElement
  texto.value = input.value
  const centavos = parsearImporte(input.value)
  if (centavos !== null) emit('update:modelValue', centavos)
}

function alSalir(): void {
  enfocado.value = false
  const centavos = parsearImporte(texto.value) ?? 0
  emit('update:modelValue', centavos)
  texto.value = formatearImporte(centavos)
}
</script>

<template>
  <div class="ui-field">
    <label v-if="label" class="ui-label" :for="idCampo">
      {{ label }}
      <span v-if="required" class="ui-label__requerido" aria-hidden="true">*</span>
    </label>
    <div class="ui-field__moneda">
      <span class="ui-field__moneda-prefijo" aria-hidden="true">$</span>
      <input
        :id="idCampo"
        class="ui-control"
        :class="{ 'ui-control--error': error }"
        type="text"
        inputmode="decimal"
        :value="texto"
        :placeholder="placeholder ?? '0,00'"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="descritoPor || undefined"
        @focus="alEnfocar"
        @input="alEscribir"
        @blur="alSalir"
      />
    </div>
    <p v-if="error" :id="idError" class="ui-field__error">
      <CircleAlert :size="14" aria-hidden="true" />
      {{ error }}
    </p>
    <p v-else-if="hint" :id="idAyuda" class="ui-field__ayuda">{{ hint }}</p>
  </div>
</template>
