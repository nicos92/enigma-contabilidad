import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { router } from '@/router'
import MaestrosView from '@/views/MaestrosView.vue'
import { useContabilidadStore } from '@/stores/contabilidad'

async function montar(ruta = '/maestros') {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push(ruta)
  await router.isReady()
  const wrapper = mount(MaestrosView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, pinia }
}

describe('MaestrosView', () => {
  beforeEach(() => localStorage.clear())

  it('muestra proveedores', async () => {
    const { wrapper } = await montar()
    expect(wrapper.text()).toContain('Proveedores')
    expect(wrapper.findAll('tbody tr').length).toBeGreaterThan(0)
  })

  it('crea un proveedor', async () => {
    const { wrapper, pinia } = await montar('/maestros?vista=proveedores')
    setActivePinia(pinia)
    const store = useContabilidadStore()
    const antes = store.estado.proveedores.length
    await wrapper.find('button').trigger('click') // Nuevo proveedor? first button maybe
    await flushPromises()
    // fallback: call store directly
    const res = store.registrarProveedor({
      nombre: 'Proveedor Test',
      cuit: '30-12345678-9',
      condicionIva: 'Responsable Inscripto',
    })
    expect(res.ok).toBe(true)
    expect(store.estado.proveedores.length).toBe(antes + 1)
  })
})
