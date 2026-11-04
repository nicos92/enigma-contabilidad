import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import AppModal from '@/components/ui/AppModal.vue'

function montarModal(abierto = false) {
  return mount(AppModal, {
    attachTo: document.body,
    props: {
      modelValue: abierto,
      titulo: 'Confirmar operación',
      descripcion: 'Esta acción registra el documento.',
    },
    slots: {
      default: '<button data-autofocus>Confirmar</button><button>Cancelar</button>',
      pie: '<button>Cerrar</button>',
    },
  })
}

function obtenerBoton(texto: string): HTMLButtonElement {
  const boton = Array.from(document.body.querySelectorAll('button')).find(
    (elemento) => elemento.textContent?.trim() === texto,
  )
  if (!(boton instanceof HTMLButtonElement)) {
    throw new Error(`No se encontró el botón ${texto}`)
  }
  return boton
}

afterEach(() => {
  document.body.classList.remove('sin-scroll')
  document.body.innerHTML = ''
})

describe('AppModal', () => {
  it('no renderiza el diálogo cuando está cerrado', () => {
    const wrapper = montarModal()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    wrapper.unmount()
  })

  it('bloquea el scroll, enfoca el primer control y lo restaura al cerrar', async () => {
    const disparador = document.createElement('button')
    disparador.textContent = 'Abrir'
    document.body.append(disparador)
    disparador.focus()

    const wrapper = montarModal()
    await wrapper.setProps({ modelValue: true })
    await flushPromises()

    const dialogo = document.body.querySelector('[role="dialog"]')
    expect(dialogo).not.toBeNull()
    expect(document.body.classList.contains('sin-scroll')).toBe(true)
    expect(document.activeElement).toBe(obtenerBoton('Confirmar'))
    expect(dialogo?.getAttribute('aria-modal')).toBe('true')

    await wrapper.setProps({ modelValue: false })
    await flushPromises()

    expect(document.body.classList.contains('sin-scroll')).toBe(false)
    expect(document.activeElement).toBe(disparador)

    wrapper.unmount()
  })

  it('cierra con Escape y emite los eventos correspondientes', async () => {
    const wrapper = montarModal(true)
    await flushPromises()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    expect(wrapper.emitted('cerrar')).toHaveLength(1)

    wrapper.unmount()
  })

  it('mantiene el foco dentro del diálogo al tabular desde el último control', async () => {
    const wrapper = montarModal(true)
    await flushPromises()

    const primero = obtenerBoton('Confirmar')
    const ultimo = obtenerBoton('Cerrar')

    Object.defineProperty(primero, 'offsetParent', { value: document.body })
    Object.defineProperty(ultimo, 'offsetParent', { value: document.body })

    ultimo.focus()
    expect(document.activeElement).toBe(ultimo)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    await flushPromises()

    expect(document.activeElement).toBe(primero)

    wrapper.unmount()
  })
})
