import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '@/App.vue'
import { router } from '@/router'

async function montarApp() {
  const wrapper = mount(App, {
    global: {
      plugins: [createPinia(), router],
    },
  })

  await router.isReady()
  await flushPromises()

  return wrapper
}

describe('App', () => {
  beforeEach(async () => {
    await router.push('/dashboard')
    await router.isReady()
  })

  it('muestra el layout provisional y el panel general', async () => {
    const wrapper = await montarApp()

    expect(wrapper.get('.app-brand__text strong').text()).toBe('Enigma Gestión')
    expect(wrapper.get('.app-topbar__title').text()).toBe('Panel general')
    expect(wrapper.text()).toContain('Bienvenido a Enigma Gestión')
    expect(window.location.hash).toBe('#/dashboard')
  })

  it('navega entre módulos por hash sin recargar la página', async () => {
    const wrapper = await montarApp()

    await router.push('/compras')
    await flushPromises()

    expect(window.location.hash).toBe('#/compras')
    expect(wrapper.get('.app-topbar__title').text()).toBe('Compras')
    expect(wrapper.text()).toContain('Módulo en preparación')
  })

  it('expone el catálogo interno de componentes en /ui-kit', async () => {
    const wrapper = await montarApp()

    await router.push('/ui-kit')
    await flushPromises()

    expect(window.location.hash).toBe('#/ui-kit')
    expect(wrapper.get('.app-topbar__title').text()).toBe('UI Kit')
    expect(wrapper.text()).toContain('Catálogo interno de tokens y componentes reutilizables')
  })
})
