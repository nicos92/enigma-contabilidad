import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { cargarEstado } from '@/core/persistencia'
import { router } from '@/router'
import { useContabilidadStore } from '@/stores/contabilidad'
import ConfiguracionView from '@/views/ConfiguracionView.vue'

async function montar() {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push('/configuracion')
  await router.isReady()
  const wrapper = mount(ConfiguracionView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, pinia }
}

function inputConValor(wrapper: Awaited<ReturnType<typeof montar>>['wrapper'], valor: string) {
  return wrapper
    .findAll('input')
    .find((input) => (input.element as HTMLInputElement).value === valor)
}

async function confirmarModal(texto: string): Promise<void> {
  await flushPromises()
  const boton = [
    ...document.body.querySelectorAll<HTMLButtonElement>('.ui-modal__pie button'),
  ].find((actual) => actual.textContent?.trim() === texto)
  expect(boton).toBeDefined()
  boton!.click()
  await flushPromises()
}

describe('ConfiguracionView', () => {
  beforeEach(() => localStorage.clear())

  it('muestra los datos de la empresa, el usuario y el almacenamiento', async () => {
    const { wrapper } = await montar()

    expect(wrapper.text()).toContain('Datos de la empresa')
    expect(wrapper.text()).toContain('Usuario de la demo')
    expect(wrapper.text()).toContain('Datos y almacenamiento')
    expect(wrapper.text()).toContain('Versión del esquema')
    expect(wrapper.text()).toContain('v1')
    expect(wrapper.text()).toContain('enigma-gestion:estado:v1')
    expect(wrapper.text()).toContain('Configuración guardada')

    expect(inputConValor(wrapper, 'Comercializadora del Sur S.R.L.')).toBeDefined()
    expect(inputConValor(wrapper, 'Lucía Fernández')).toBeDefined()
  })

  it('guarda y persiste los cambios de empresa y usuario', async () => {
    const { wrapper, pinia } = await montar()
    const razonSocial = inputConValor(wrapper, 'Comercializadora del Sur S.R.L.')
    const usuario = inputConValor(wrapper, 'Lucía Fernández')

    await razonSocial!.setValue('Empresa Editada S.A.')
    await usuario!.setValue('Usuario Editado')
    await flushPromises()

    expect(wrapper.text()).toContain('Cambios sin guardar')
    const guardar = wrapper
      .findAll('button')
      .find((boton) => boton.text().includes('Guardar cambios'))
    expect(guardar).toBeDefined()
    await guardar!.trigger('click')
    await flushPromises()

    setActivePinia(pinia)
    const store = useContabilidadStore()
    expect(store.estado.empresa.razonSocial).toBe('Empresa Editada S.A.')
    expect(store.estado.usuario.nombre).toBe('Usuario Editado')
    expect(cargarEstado()?.empresa.razonSocial).toBe('Empresa Editada S.A.')
    expect(cargarEstado()?.usuario.nombre).toBe('Usuario Editado')
    expect(wrapper.text()).toContain('Configuración guardada')
  })

  it('previsualiza y elimina el logo guardado', async () => {
    const { wrapper, pinia } = await montar()
    setActivePinia(pinia)
    const store = useContabilidadStore()
    const logo = 'data:image/png;base64,AAAA'

    store.actualizarEmpresa({ logoDataUrl: logo })
    await nextTick()

    expect(wrapper.find('.configuracion-logo__marco img').attributes('src')).toBe(logo)
    expect(wrapper.text()).toContain('Logo personalizado activo')

    const quitar = wrapper.findAll('button').find((boton) => boton.text().includes('Quitar logo'))
    await quitar!.trigger('click')
    await confirmarModal('Quitar logo')

    expect(store.estado.empresa.logoDataUrl).toBeNull()
    expect(wrapper.find('.configuracion-logo__marco img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Espacio provisorio activo')
    wrapper.unmount()
  })

  it('restaura la demo y recarga los formularios', async () => {
    const { wrapper, pinia } = await montar()
    setActivePinia(pinia)
    const store = useContabilidadStore()
    store.actualizarEmpresa({
      razonSocial: 'Empresa Editada S.A.',
      logoDataUrl: 'data:image/png;base64,AAAA',
    })
    store.actualizarUsuario({ nombre: 'Usuario Editado' })
    await nextTick()

    const restaurar = wrapper
      .findAll('button')
      .find((boton) => boton.text().includes('Restaurar demo'))
    await restaurar!.trigger('click')
    await confirmarModal('Restaurar demo')

    expect(store.estado.empresa.razonSocial).toBe('Comercializadora del Sur S.R.L.')
    expect(store.estado.empresa.logoDataUrl).toBeNull()
    expect(store.estado.usuario.nombre).toBe('Lucía Fernández')
    expect(inputConValor(wrapper, 'Comercializadora del Sur S.R.L.')).toBeDefined()
    expect(inputConValor(wrapper, 'Lucía Fernández')).toBeDefined()
    wrapper.unmount()
  })
})
