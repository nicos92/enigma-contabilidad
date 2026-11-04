import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CurrencyInput from '@/components/ui/CurrencyInput.vue'

function montar(centavos = 0) {
  return mount(CurrencyInput, {
    props: {
      modelValue: centavos,
      label: 'Importe',
    },
  })
}

describe('CurrencyInput', () => {
  it('muestra el importe formateado en pesos', () => {
    const wrapper = montar(125000000)

    expect(wrapper.get('input').element.value).toBe('1.250.000,00')
    expect(wrapper.get('label').text()).toContain('Importe')
  })

  it('convierte el texto ingresado a centavos enteros', async () => {
    const wrapper = montar()
    const input = wrapper.get('input')

    await input.setValue('1.234,56')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([123456])
  })

  it('acepta un punto decimal simple sin separador de miles', async () => {
    const wrapper = montar()
    const input = wrapper.get('input')

    await input.setValue('1234.56')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([123456])
  })

  it('normaliza el valor al perder el foco', async () => {
    const wrapper = montar()
    const input = wrapper.get('input')

    await input.setValue('9876,5')
    await input.trigger('blur')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([987650])
    expect(input.element.value).toBe('9.876,50')
  })

  it('usa cero cuando el campo queda vacío', async () => {
    const wrapper = montar(500000)
    const input = wrapper.get('input')

    await input.setValue('')
    await input.trigger('blur')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([0])
    expect(input.element.value).toBe('0,00')
  })

  it('expone el error y sus atributos de accesibilidad', () => {
    const wrapper = mount(CurrencyInput, {
      props: {
        modelValue: 0,
        label: 'Importe',
        hint: 'Ingresá el total con IVA.',
        error: 'El importe es obligatorio.',
      },
    })

    const input = wrapper.get('input')

    expect(input.classes()).toContain('ui-control--error')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toContain('error')
    expect(wrapper.text()).toContain('El importe es obligatorio.')
  })
})
